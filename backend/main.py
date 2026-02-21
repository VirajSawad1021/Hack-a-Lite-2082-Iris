import os
import json
import time
import queue
import asyncio
import threading
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from crewai import Crew, Process
from agents import NexOSAgents
from tasks import NexOSTasks

app = FastAPI(title="NexOS Agent API", version="2.0")

# ── CORS: allow both Next.js (3000) and Vite (5173) ──────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8001",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Pydantic models ───────────────────────────────────────────

class ChatRequest(BaseModel):
    agent_type: str          # orchestrator | sales | customer_service |
                             # technical | market_intelligence | meeting | hr_ops
    message: str
    conversation_id: Optional[str] = None  # for future Supabase threading

class ChatResponse(BaseModel):
    success: bool
    agent_type: str
    agent_name: str
    response: str
    conversation_id: Optional[str] = None

class AgentInfo(BaseModel):
    id: str
    type: str
    name: str
    description: str
    status: str
    avatar_color: str

# ── Agent metadata (mirrors frontend agentStore.ts) ──────────

AGENT_META = {
    'orchestrator': {
        'name': 'Master Orchestrator',
        'description': 'Coordinates all agents and provides strategic direction',
        'avatar_color': '#6366F1',
    },
    'sales': {
        'name': 'Sales Agent',
        'description': 'Pipeline management, CRM, deal tracking',
        'avatar_color': '#06B6D4',
    },
    'customer_service': {
        'name': 'Customer Service',
        'description': 'Support tickets, NPS, customer health',
        'avatar_color': '#10B981',
    },
    'technical': {
        'name': 'Technical Agent',
        'description': 'Engineering metrics, deployments, system health',
        'avatar_color': '#F59E0B',
    },
    'market_intelligence': {
        'name': 'Market Intelligence',
        'description': 'Competitor tracking, trends, industry news',
        'avatar_color': '#8B5CF6',
    },
    'meeting': {
        'name': 'Meeting Agent',
        'description': 'Scheduling, transcription, action items',
        'avatar_color': '#F43F5E',
    },
    'hr_ops': {
        'name': 'HR & Ops Agent',
        'description': 'Team management, hiring, operations',
        'avatar_color': '#EC4899',
    },
}

# ── Endpoints ─────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "message": "NexOS Agent API",
        "version": "2.0",
        "agents": list(AGENT_META.keys()),
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/agents")
async def get_agents():
    """Return all 7 NexOS agents with metadata — mirrors frontend agentStore."""
    return [
        AgentInfo(
            id=agent_type,
            type=agent_type,
            status="idle",
            **meta,
        )
        for agent_type, meta in AGENT_META.items()
    ]


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Send a message to any NexOS agent and get a real AI response.

    Body:
        agent_type: one of orchestrator | sales | customer_service |
                    technical | market_intelligence | meeting | hr_ops
        message:    the user's message
    """
    agent_type = request.agent_type.strip().lower()

    if agent_type not in AGENT_META:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown agent_type '{agent_type}'. "
                   f"Valid: {list(AGENT_META.keys())}",
        )

    try:
        nexos = NexOSAgents()
        agent = nexos.get_agent(agent_type)
        task  = NexOSTasks.build(agent_type, request.message, agent)

        crew = Crew(
            agents=[agent],
            tasks=[task],
            process=Process.sequential,
            verbose=False,   # set True for debug logging
        )

        result = crew.kickoff()
        response_text = str(result).strip()

        return ChatResponse(
            success=True,
            agent_type=agent_type,
            agent_name=AGENT_META[agent_type]['name'],
            response=response_text,
            conversation_id=request.conversation_id,
        )

    except Exception as exc:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    Same as /chat but streams events via SSE as the agent works.

    SSE event types:
      agent_started  — agent kicked off
      tool_used      — agent called a tool  { tool, input }
      thinking       — agent reasoning step { content }
      step           — generic step         { content }
      final_answer   — completed response   { content }
      error          — failure              { content }
      done           — end of stream
    """
    agent_type = request.agent_type.strip().lower()

    if agent_type not in AGENT_META:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown agent_type '{agent_type}'. Valid: {list(AGENT_META.keys())}",
        )

    event_q: queue.Queue = queue.Queue()

    # ── CrewAI step callback (runs in the crew thread) ────────
    def step_callback(step_output):
        try:
            if hasattr(step_output, 'tool') and hasattr(step_output, 'tool_input'):
                event_q.put({
                    'type': 'tool_used',
                    'tool': str(step_output.tool),
                    'input': str(step_output.tool_input)[:300],
                })
            elif hasattr(step_output, 'return_values'):
                output = step_output.return_values.get('output', str(step_output))
                event_q.put({'type': 'thinking', 'content': str(output)[:400]})
            elif hasattr(step_output, 'text'):
                event_q.put({'type': 'thinking', 'content': str(step_output.text)[:400]})
            else:
                txt = str(step_output)[:300]
                if txt.strip():
                    event_q.put({'type': 'step', 'content': txt})
        except Exception:
            pass

    # ── Run the crew in a background thread ──────────────────
    def run_crew():
        try:
            nexos   = NexOSAgents()
            agent   = nexos.get_agent(agent_type)
            agent.step_callback = step_callback
            task    = NexOSTasks.build(agent_type, request.message, agent)
            crew    = Crew(
                agents=[agent],
                tasks=[task],
                process=Process.sequential,
                verbose=False,
            )
            result = crew.kickoff()
            result_text = str(result).strip()

            # ── Stream the answer word-by-word for live typewriter effect ──
            words = result_text.split(' ')
            chunk_size = 3
            for i in range(0, len(words), chunk_size):
                chunk = ' '.join(words[i:i + chunk_size])
                # add space between chunks but not trailing space on last
                if i + chunk_size < len(words):
                    chunk += ' '
                event_q.put({'type': 'text_chunk', 'content': chunk})
                time.sleep(0.04)   # ~25 chunks/sec

            event_q.put({'type': 'final_answer', 'content': result_text})
        except Exception as e:
            import traceback; traceback.print_exc()
            event_q.put({'type': 'error', 'content': str(e)})
        finally:
            event_q.put(None)   # sentinel

    # ── SSE generator ─────────────────────────────────────────
    async def event_generator():
        yield f"data: {json.dumps({'type': 'agent_started', 'agent_name': AGENT_META[agent_type]['name'], 'agent_type': agent_type})}\n\n"

        loop = asyncio.get_event_loop()
        thread = threading.Thread(target=run_crew, daemon=True)
        thread.start()

        while True:
            try:
                event = await loop.run_in_executor(None, event_q.get, True, 1.0)
            except Exception:
                yield ": heartbeat\n\n"
                continue

            if event is None:
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
                break

            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
