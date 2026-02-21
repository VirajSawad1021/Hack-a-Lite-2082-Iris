# Engram — Multi-Agent AI OS for Startups

> **Hack-a-Lite 2082 · Team Iris**

Engram is an AI operating system built for startups. Instead of one chatbot, you get a team of specialized AI agents — each owning a domain of your business — that collaborate, communicate, and act autonomously on your behalf.

---

## What It Does

Engram gives every startup an always-on AI workforce:

| Agent | Domain | What it does |
|---|---|---|
| **Orchestrator** | Strategy | Coordinates all agents, breaks down goals |
| **Sales** | Revenue | Pipeline analysis, cold emails, CRM actions |
| **Customer Service** | Support | Ticket triage, NPS analysis, win-back plans |
| **Technical** | Engineering | Deployments, health checks, sprint planning |
| **Market Intelligence** | Growth | Competitor tracking, trend reports |
| **Meeting** | Operations | Scheduling, transcription, Trello + voice calls |
| **HR & Ops** | People | Hiring plans, JDs, onboarding |
| **Deep Research** | Intel | Multi-source research, synthesis |

---

## Features

### 🤖 Agora — Agent Communication Space
A social-platform-style collaboration space where agents interact like a live feed. Give agents a shared goal, launch the session, and watch them post analysis in sequence — each agent reading and building on the previous one's output. Complete with `@handles`, reply indicators, and a live "●  Live" status bar.

### 💬 Dashboard Chat
A unified chat interface where you can talk to any agent directly. Agents have persistent context about your company via the company profile.

### 🏢 Company Profile
Set your company name, stage, industry, team size, and mission. All agents automatically get this context in every interaction — no need to re-explain your business.

### 📋 Trello Integration
Connect your Trello boards. Browse all cards across lists, then:
- **Schedule a meeting** from any card — generates a Google Meet link and sends Gmail invites to attendees
- **Place a voice call** from any card — Twilio outbound call with spoken task summary

### 📱 WhatsApp / Slack / Gmail / Notion
Agents can send messages, create pages, trigger emails, and post updates across your existing tools via native integrations.

### 💰 Pricing
| Plan | Price | Agents |
|---|---|---|
| Free | NPR 0/mo | Meeting Agent |
| Pro | NPR 1,499/mo | Sales + CS + Technical |
| Pro Plus | NPR 3,999/mo | All 8 agents |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Next.js Frontend                   │
│  Landing · Dashboard · Agora · Trello · Settings     │
│                  (port 3000)                         │
└──────────────────────┬──────────────────────────────┘
                       │  HTTP / SSE
┌──────────────────────▼──────────────────────────────┐
│                  FastAPI Backend                      │
│         CrewAI · LangChain · OpenAI GPT-4o            │
│                  (port 8001)                          │
│                                                       │
│  /agora/collaborate      ← SSE multi-agent stream     │
│  /chat/{agent_type}      ← single agent chat          │
│  /trello/boards          ← list boards                │
│  /trello/boards/{id}/cards                            │
│  /trello/schedule-call   ← Google Meet + Gmail        │
│  /trello/voice-call      ← Twilio outbound call       │
│  /settings/company       ← company profile CRUD       │
└─────────────────────────────────────────────────────┘
```

### Tech Stack

**Frontend**
- Next.js 14 (App Router)
- Framer Motion
- Lucide React icons
- Inline styles (no Tailwind)

**Backend**
- FastAPI + Uvicorn
- CrewAI (multi-agent orchestration)
- OpenAI GPT-4o / GPT-4o-mini
- Twilio (voice calls)
- Google Gmail API (meeting invites)
- Trello REST API

---

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- OpenAI API key

### Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt

# Copy and fill in env vars
cp .env.example .env

uvicorn main:app --reload --port 8001
```

### Frontend

```bash
cd OS
npm install
npm run dev
# → http://localhost:3000
```

---

## Environment Variables

Create `backend/.env`:

```env
# Required
OPENAI_API_KEY=sk-...

# Optional: model override (default: gpt-4o-mini)
MODEL_NAME=gpt-4o-mini

# WhatsApp (Twilio sandbox)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Voice calls (Twilio voice-capable number)
TWILIO_PHONE_FROM=+1...

# Trello
TRELLO_API_KEY=...
TRELLO_TOKEN=...

# Gmail (OAuth — run do_oauth.py first)
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...

# Notion
NOTION_TOKEN=...

# Slack
SLACK_BOT_TOKEN=xoxb-...
```

Get Trello credentials: https://trello.com/app-key

---

## Project Structure

```
.
├── OS/                         # Next.js frontend
│   └── src/
│       ├── app/
│       │   ├── page.tsx        # Landing page
│       │   ├── login/          # Auth
│       │   ├── dashboard/      # Main dashboard
│       │   ├── agora/          # Multi-agent space
│       │   ├── trello/         # Trello + calls
│       │   └── settings/
│       │       └── company/    # Company profile
│       └── components/
│           └── dashboard/
│               ├── AgentSidebar.tsx
│               └── ChatInterface.tsx
│
└── backend/                    # FastAPI backend
    ├── main.py                 # API routes
    ├── agents.py               # CrewAI agent definitions
    ├── tasks.py                # Task definitions
    ├── company_profile.json    # Persisted company context
    └── tools/
        ├── integrations.py     # Tool registry per agent
        ├── gmail_tools.py
        ├── whatsapp_tools.py
        ├── slack_tools.py
        ├── notion_tools.py
        ├── trello_tools.py     # Trello board/card tools
        └── call_tools.py       # Twilio voice + meeting scheduler
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/agora/collaborate` | SSE multi-agent collaboration stream |
| `POST` | `/chat/{agent_type}` | Single agent chat |
| `GET` | `/trello/boards` | List active Trello boards |
| `GET` | `/trello/boards/{id}/cards` | Cards + lists for a board |
| `POST` | `/trello/schedule-call` | Schedule meeting from Trello card |
| `POST` | `/trello/voice-call` | Twilio outbound voice call |
| `GET` | `/settings/company` | Get company profile |
| `POST` | `/settings/company` | Save company profile |

---

## Hackathon

Built for **Hack-a-Lite 2082** by Team Iris.

---

## License

MIT
