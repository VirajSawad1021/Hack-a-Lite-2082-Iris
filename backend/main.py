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
from textwrap import dedent
from langchain_core.callbacks.base import BaseCallbackHandler
from langchain_openai import ChatOpenAI
from crewai import Crew, Process, Task
from agents import EngramAgents
from tasks import NexOSTasks
from company_context import load_profile, save_profile as _save_profile, format_context

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

class CompanyProfileModel(BaseModel):
    company_name: Optional[str] = ""
    tagline: Optional[str] = ""
    industry: Optional[str] = ""
    stage: Optional[str] = ""
    product_description: Optional[str] = ""
    target_customers: Optional[str] = ""
    team_size: Optional[str] = ""
    key_differentiators: Optional[str] = ""
    competitors: Optional[str] = ""
    revenue_model: Optional[str] = ""

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
    'deep_research': {
        'name': 'Deep Research',
        'description': 'Multi-source internet research with comprehensive reports',
        'avatar_color': '#0EA5E9',
    },
}

# ── Real-time token streaming callback ───────────────────────

class TokenQueueCallback(BaseCallbackHandler):
    """
    LangChain callback that pipes every LLM token into an SSE queue
    the moment it is generated — before the full response is complete.
    """
    def __init__(self, q: queue.Queue):
        super().__init__()
        self.q = q

    def on_llm_new_token(self, token: str, **kwargs):
        if token:
            self.q.put({'type': 'text_chunk', 'content': token})

    def on_llm_error(self, error, **kwargs):
        self.q.put({'type': 'error', 'content': str(error)})


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


@app.get("/api/company-profile")
async def get_company_profile():
    """Return the current startup company profile."""
    return load_profile()


@app.patch("/api/company-profile")
async def update_company_profile(data: CompanyProfileModel):
    """Save the startup company profile — agents pick it up on the next request."""
    return _save_profile(data.dict())


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
        nexos = EngramAgents()
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
            # Build a real streaming LLM — tokens flow into event_q the
            # moment the model generates them, not after completion.
            streaming_llm = ChatOpenAI(
                model=os.getenv('MODEL_NAME', 'gpt-4o-mini'),
                streaming=True,
                callbacks=[TokenQueueCallback(event_q)],
                temperature=float(os.getenv('MODEL_TEMPERATURE', '0.7')),
                api_key=os.getenv('OPENAI_API_KEY'),
            )

            nexos   = EngramAgents(llm=streaming_llm)
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

            # Send the complete assembled text so the frontend can save it
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


# ── Agora: Multi-agent collaboration ─────────────────────────

class AgoraRequest(BaseModel):
    goal: str
    agent_types: List[str]   # ordered list of agents to involve


_AGORA_ROLE_FOCUS = {
    'orchestrator':        'synthesize all contributions, set clear priorities, and produce the final action plan',
    'sales':               'identify revenue opportunities, go-to-market angles, and concrete sales tactics',
    'customer_service':    'surface customer pain points, retention risks, and support implications',
    'technical':           'assess technical feasibility, flag engineering risks, and recommend architecture decisions',
    'market_intelligence': 'research the competitive landscape, market size, trends, and key signals',
    'meeting':             'structure next steps with owners, deadlines, and a clear decision log',
    'hr_ops':              'assess team capacity, identify hiring needs, and flag people-ops requirements',
    'deep_research':       'conduct deep research to surface hard evidence, data points, and strategic insights',
}

def _build_agora_task_desc(
    agent_type: str,
    goal: str,
    position: int,
    total: int,
    prev_outputs: list,
) -> str:
    focus = _AGORA_ROLE_FOCUS.get(agent_type, 'provide your specialized analysis')
    ctx = format_context()

    prev_block = ''
    if prev_outputs:
        prev_block = '\n\n--- PREVIOUS AGENTS OUTPUT (build on this, do not repeat) ---\n'
        for prev_type, prev_text in prev_outputs:
            name = AGENT_META.get(prev_type, {}).get('name', prev_type)
            prev_block += f'\n[{name}]:\n{prev_text[:2000]}\n'
        prev_block += '\n--- END PREVIOUS OUTPUT ---'

    if position == 0:
        role_note = (
            'You are the FIRST agent to speak. '
            'Set the foundation — be structured and specific. '
            'End with a clear handoff note for the next agent.'
        )
    elif position == total - 1:
        role_note = (
            'You are the FINAL agent. '
            'Synthesize ALL previous contributions into a unified recommendation. '
            'Produce: Summary → Key Decisions → Action Plan (owner + deadline per item).'
        )
    else:
        role_note = (
            f'You are agent {position + 1} of {total}. '
            'Build DIRECTLY on previous outputs — skip anything already covered. '
            'Add only your unique perspective and concrete additions.'
        )

    return dedent(f"""
        {ctx}
        === MULTI-AGENT COLLABORATION SESSION ===
        Goal: "{goal}"

        {role_note}
        Your role: {focus}.
        {prev_block}

        Use markdown: headers, bullet points, bold for key terms.
        Be direct. Founders have no time for filler.
    """).strip()


@app.post("/agora/collaborate")
async def agora_collaborate(request: AgoraRequest):
    """
    Run a multi-agent collaboration session.
    Streams SSE events as each agent contributes in sequence.

    Event types:
      session_start   — lists all agents involved
      agent_start     — agent N is now thinking
      text_chunk      — token from the current agent  { agent, content }
      agent_complete  — agent N finished
      session_complete — all agents done
      error           — failure
      done            — end of stream
    """
    agent_types = [a.strip().lower() for a in request.agent_types]
    invalid = [a for a in agent_types if a not in AGENT_META]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Unknown agent types: {invalid}")
    if not agent_types:
        raise HTTPException(status_code=400, detail="agent_types must not be empty")

    event_q: queue.Queue = queue.Queue()

    def run_session():
        try:
            prev_outputs: list = []   # [(agent_type, text), ...]

            for i, at in enumerate(agent_types):
                # ── Tell frontend this agent is starting ──────
                event_q.put({
                    'type': 'agent_start',
                    'agent': at,
                    'agent_name': AGENT_META[at]['name'],
                    'avatar_color': AGENT_META[at]['avatar_color'],
                    'position': i,
                    'total': len(agent_types),
                })

                # ── Streaming LLM for this agent ──────────────
                current_agent = [at]   # mutable reference for callback closure

                class _TaggedCallback(BaseCallbackHandler):
                    def on_llm_new_token(self, token: str, **kwargs):
                        if token:
                            event_q.put({
                                'type': 'text_chunk',
                                'agent': current_agent[0],
                                'content': token,
                            })
                    def on_llm_error(self, error, **kwargs):
                        event_q.put({'type': 'error', 'content': str(error)})

                streaming_llm = ChatOpenAI(
                    model=os.getenv('MODEL_NAME', 'gpt-4o-mini'),
                    streaming=True,
                    callbacks=[_TaggedCallback()],
                    temperature=float(os.getenv('MODEL_TEMPERATURE', '0.7')),
                    api_key=os.getenv('OPENAI_API_KEY'),
                )

                nexos = EngramAgents(llm=streaming_llm)
                agent = nexos.get_agent(at)

                task_desc = _build_agora_task_desc(at, request.goal, i, len(agent_types), prev_outputs)
                task = Task(
                    description=task_desc,
                    expected_output=(
                        'A structured, markdown-formatted contribution to the collaboration. '
                        'Specific, actionable, with headers and bullets.'
                    ),
                    agent=agent,
                )

                crew = Crew(
                    agents=[agent],
                    tasks=[task],
                    process=Process.sequential,
                    verbose=False,
                )
                result = crew.kickoff()
                result_text = str(result).strip()

                prev_outputs.append((at, result_text))

                event_q.put({
                    'type': 'agent_complete',
                    'agent': at,
                    'agent_name': AGENT_META[at]['name'],
                    'position': i,
                })

            event_q.put({'type': 'session_complete', 'total_agents': len(agent_types)})

        except Exception as e:
            import traceback; traceback.print_exc()
            event_q.put({'type': 'error', 'content': str(e)})
        finally:
            event_q.put(None)

    async def event_generator():
        # Announce session immediately
        yield f"data: {json.dumps({'type': 'session_start', 'agents': [{'type': a, 'name': AGENT_META[a]['name'], 'color': AGENT_META[a]['avatar_color']} for a in agent_types]})}\n\n"

        loop = asyncio.get_event_loop()
        thread = threading.Thread(target=run_session, daemon=True)
        thread.start()

        while True:
            try:
                event = await loop.run_in_executor(None, event_q.get, True, 1.0)
            except Exception:
                yield ': heartbeat\n\n'
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


# ══════════════════════════════════════════════════════════════
# TRELLO + CALL ENDPOINTS
# ══════════════════════════════════════════════════════════════

import os as _os

def _trello_api_get(path: str, params: dict = {}) -> list | dict:
    import requests as _req
    key   = _os.getenv("TRELLO_API_KEY", "")
    token = _os.getenv("TRELLO_TOKEN", "")
    if not key or not token:
        raise HTTPException(status_code=503, detail="TRELLO_API_KEY / TRELLO_TOKEN not set in .env")
    resp = _req.get(
        f"https://api.trello.com/1/{path}",
        params={"key": key, "token": token, **params},
        timeout=10,
    )
    if not resp.ok:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()


@app.get("/trello/boards")
async def trello_list_boards():
    """List all active Trello boards for the linked account."""
    boards = _trello_api_get("members/me/boards", {"fields": "name,id,url,closed"})
    return [b for b in boards if not b.get("closed")]


@app.get("/trello/boards/{board_id}/cards")
async def trello_get_cards(board_id: str):
    """Return all cards + list names for a board."""
    cards = _trello_api_get(
        f"boards/{board_id}/cards",
        {
            "fields": "name,desc,due,idList,idMembers,shortUrl,labels",
            "members": "true",
            "member_fields": "fullName,username,avatarUrl",
        },
    )
    lists_raw = _trello_api_get(f"boards/{board_id}/lists", {"fields": "name,id"})
    lists_map  = {lst["id"]: lst["name"] for lst in lists_raw}
    # Attach list name to each card
    for c in cards:
        c["listName"] = lists_map.get(c.get("idList", ""), "Unknown")
    return {"cards": cards, "lists": lists_raw}


class ScheduleCallRequest(BaseModel):
    card_id:          str
    card_title:       str
    card_description: str = ""
    attendee_emails:  str          # comma-separated
    proposed_time:    str
    duration_minutes: int = 30
    also_voice_call:  bool = False  # if True, also ring each phone number mentioned
    phone_number:     str = ""      # explicit phone to call (optional)


@app.post("/trello/schedule-call")
async def trello_schedule_call(req: ScheduleCallRequest):
    """
    Schedule a meeting from a Trello card: generate Google Meet link,
    send invite emails via Gmail, and optionally make a Twilio voice call.
    Does NOT require an agent — runs tools directly for speed.
    """
    from tools.call_tools import ScheduleMeetingFromCardTool, TwilioTaskAlertCallTool

    meeting_result = ScheduleMeetingFromCardTool()._run(
        card_title=req.card_title,
        card_description=req.card_description,
        attendee_emails=req.attendee_emails,
        proposed_time=req.proposed_time,
        duration_minutes=req.duration_minutes,
    )

    # Log a comment back to the Trello card
    try:
        from tools.trello_tools import TrelloCommentCardTool
        TrelloCommentCardTool()._run(
            card_id=req.card_id,
            comment=f"📅 Meeting scheduled by Engram agent\n{meeting_result}",
        )
    except Exception:
        pass

    voice_result = None
    if req.also_voice_call and req.phone_number:
        voice_result = TwilioTaskAlertCallTool()._run(
            to=req.phone_number,
            task_title=req.card_title,
            urgency="normal",
        )

    return {
        "success": True,
        "meeting": meeting_result,
        "voice_call": voice_result,
    }


class VoiceCallRequest(BaseModel):
    to:           str
    task_title:   str  = "Task alert from Engram"
    message:      str  = ""
    urgency:      str  = "normal"


@app.post("/trello/voice-call")
async def trello_voice_call(req: VoiceCallRequest):
    """
    Place an outbound Twilio voice call to alert someone about a Trello task.
    """
    from tools.call_tools import TwilioVoiceCallTool, TwilioTaskAlertCallTool

    if req.message:
        result = TwilioVoiceCallTool()._run(to=req.to, message=req.message)
    else:
        result = TwilioTaskAlertCallTool()._run(
            to=req.to,
            task_title=req.task_title,
            urgency=req.urgency,
        )

    success = result.startswith("✅")
    return {"success": success, "result": result}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
