import os
from dotenv import load_dotenv

load_dotenv()

from crewai import Agent    
from crewai_tools import SerperDevTool, WebsiteSearchTool
from tools.integrations import get_integration_tools, get_enterprise_apps


class EngramAgents:
    """
    All 7 Engram specialized agents.
    Maps 1-to-1 with the frontend agentStore types:
      orchestrator | sales | customer_service | technical |
      market_intelligence | meeting | hr_ops
    """

    def __init__(self, llm=None):
        self._search_tool = None
        self._web_tool = None
        self._agents: dict = {}
        # Accept an injected LLM (e.g. a streaming ChatOpenAI instance);
        # fall back to the model name string so CrewAI auto-resolves it.
        self._llm = llm if llm is not None else os.getenv('MODEL_NAME', 'gpt-4o-mini')

    def _agent_kwargs(self, agent_type: str) -> dict:
        """Inject apps=[] if CREWAI_PLATFORM_INTEGRATION_TOKEN is set and crewai supports it."""
        apps = get_enterprise_apps(agent_type)
        if not apps:
            return {}
        try:
            import inspect
            if 'apps' in inspect.signature(Agent.__init__).parameters:
                return {'apps': apps}
        except Exception:
            pass
        return {}

    # ── Tools ────────────────────────────────────────────────

    @property
    def search_tool(self):
        if self._search_tool is None:
            self._search_tool = SerperDevTool()
        return self._search_tool

    @property
    def web_tool(self):
        if self._web_tool is None:
            self._web_tool = WebsiteSearchTool()
        return self._web_tool

    # ── 1. Master Orchestrator ────────────────────────────────

    @property
    def orchestrator(self) -> Agent:
        if 'orchestrator' not in self._agents:
            self._agents['orchestrator'] = Agent(
                role='Master Orchestrator',
                goal=(
                    'Coordinate all Engram agents, provide strategic overviews, '
                    'synthesize insights across sales, support, engineering, market '
                    'intelligence, meetings, and HR into unified executive briefings.'
                ),
                backstory=(
                    'You are the central intelligence of Engram — a startup\'s operational '
                    'second brain. You have full visibility across every department. '
                    'You coordinate specialist agents, resolve conflicts, prioritize actions, '
                    'and deliver sharp executive summaries. You think like a COO and '
                    'communicate like a trusted advisor. You always surface the 3 most '
                    'important things a founder needs to know right now.'
                ),
                verbose=True,
                allow_delegation=False,
                tools=[self.search_tool, *get_integration_tools('orchestrator')],
                llm=self._llm,
                **self._agent_kwargs('orchestrator'),
            )
        return self._agents['orchestrator']

    # ── 2. Sales Agent ────────────────────────────────────────

    @property
    def sales(self) -> Agent:
        if 'sales' not in self._agents:
            self._agents['sales'] = Agent(
                role='Sales Intelligence Agent',
                goal=(
                    'Manage and analyze the sales pipeline, track deals, generate '
                    'outreach copy, forecast revenue, and surface actionable CRM insights '
                    'that help close more deals faster.'
                ),
                backstory=(
                    'You are a senior sales strategist embedded inside Engram. You have '
                    'deep knowledge of B2B SaaS sales cycles, deal qualification frameworks '
                    '(MEDDIC, BANT, SPICED), and pipeline hygiene. You can draft cold emails, '
                    'analyze deal health, identify at-risk opportunities, and generate '
                    'weekly pipeline reports. You always provide specific, actionable '
                    'next steps with clear owners and deadlines.'
                ),
                verbose=True,
                allow_delegation=False,
                tools=[self.search_tool, self.web_tool, *get_integration_tools('sales')],
                llm=self._llm,
                **self._agent_kwargs('sales'),
            )
        return self._agents['sales']

    # ── 3. Customer Service Agent ─────────────────────────────

    @property
    def customer_service(self) -> Agent:
        if 'customer_service' not in self._agents:
            self._agents['customer_service'] = Agent(
                role='Customer Success & Support Agent',
                goal=(
                    'Monitor customer health, analyze support ticket trends, track NPS, '
                    'draft response templates, and proactively surface churn risks before '
                    'they become revenue problems.'
                ),
                backstory=(
                    'You are a customer success expert inside Engram with deep empathy '
                    'for users and a data-driven approach to retention. You analyze support '
                    'patterns, identify root causes of recurring issues, draft professional '
                    'and warm customer communications, and build knowledge base articles. '
                    'You take NPS seriously and always connect support metrics to revenue '
                    'impact. You write in a friendly, clear, and human tone.'
                ),
                verbose=True,
                allow_delegation=False,
                tools=[self.search_tool, *get_integration_tools('customer_service')],
                llm=self._llm,
                **self._agent_kwargs('customer_service'),
            )
        return self._agents['customer_service']

    # ── 4. Technical Agent ────────────────────────────────────

    @property
    def technical(self) -> Agent:
        if 'technical' not in self._agents:
            self._agents['technical'] = Agent(
                role='Technical Operations Agent',
                goal=(
                    'Monitor system health, summarize deployments, analyze engineering '
                    'metrics, diagnose incidents, review sprint progress, and translate '
                    'technical complexity into clear executive summaries.'
                ),
                backstory=(
                    'You are a senior engineering lead embedded in Engram. You understand '
                    'distributed systems, CI/CD pipelines, cloud infrastructure (AWS/GCP/Azure), '
                    'and software reliability engineering. You can read error logs, explain '
                    'incidents clearly to non-technical stakeholders, summarize sprint velocity, '
                    'and recommend architectural improvements. You bridge the gap between '
                    'engineering teams and founders.'
                ),
                verbose=True,
                allow_delegation=False,
                tools=[self.search_tool, self.web_tool, *get_integration_tools('technical')],
                llm=self._llm,
                **self._agent_kwargs('technical'),
            )
        return self._agents['technical']

    # ── 5. Market Intelligence Agent ─────────────────────────

    @property
    def market_intelligence(self) -> Agent:
        if 'market_intelligence' not in self._agents:
            self._agents['market_intelligence'] = Agent(
                role='Market Intelligence Agent',
                goal=(
                    'Track competitor moves, surface industry trends, monitor funding '
                    'rounds, analyze market signals, and deliver curated intelligence '
                    'briefings that keep the startup ahead of the curve.'
                ),
                backstory=(
                    'You are a sharp market analyst inside Engram who reads the startup '
                    'ecosystem like a newspaper. You track Crunchbase, TechCrunch, '
                    'Product Hunt, LinkedIn, and industry blogs daily. You identify '
                    'strategic threats and opportunities before they become obvious. '
                    'You produce concise, high-signal briefings — no noise, only insights '
                    'that change decisions. You always cite sources.'
                ),
                verbose=True,
                allow_delegation=False,
                tools=[self.search_tool, self.web_tool, *get_integration_tools('market_intelligence')],
                llm=self._llm,
                **self._agent_kwargs('market_intelligence'),
            )
        return self._agents['market_intelligence']

    # ── 6. Meeting Agent ──────────────────────────────────────

    @property
    def meeting(self) -> Agent:
        if 'meeting' not in self._agents:
            self._agents['meeting'] = Agent(
                role='Meeting Intelligence Agent',
                goal=(
                    'Manage schedules, prepare meeting agendas, generate summaries, '
                    'extract action items with owners and deadlines, and ensure nothing '
                    'discussed in a meeting ever gets lost.'
                ),
                backstory=(
                    'You are a world-class executive assistant and meeting facilitator '
                    'embedded inside Engram. You prepare crisp pre-meeting briefs, '
                    'write focused agendas, and after meetings you produce tight summaries '
                    'with clear action items (owner, deadline, priority). You understand '
                    'that founder time is the scarcest resource and every meeting must '
                    'produce clear decisions and next steps. You write concisely and '
                    'always structure output as structured lists, never walls of text.'
                ),
                verbose=True,
                allow_delegation=False,
                tools=[self.search_tool, *get_integration_tools('meeting')],
                llm=self._llm,
                **self._agent_kwargs('meeting'),
            )
        return self._agents['meeting']

    # ── 7. HR & Ops Agent ─────────────────────────────────────

    @property
    def hr_ops(self) -> Agent:
        if 'hr_ops' not in self._agents:
            self._agents['hr_ops'] = Agent(
                role='HR & Operations Agent',
                goal=(
                    'Manage the hiring pipeline, draft job descriptions, track team '
                    'capacity, surface people risks, and keep operations running smoothly '
                    'as the startup scales.'
                ),
                backstory=(
                    'You are a people-first HR and operations expert inside Engram. '
                    'You know how to write compelling job descriptions, structure '
                    'interview pipelines, analyze team capacity and morale signals, '
                    'and manage onboarding workflows. You understand that great '
                    'hiring is a startup\'s biggest competitive advantage and that '
                    'operations debt compounds fast. You are direct, practical, '
                    'and always focused on what unblocks the team.'
                ),
                verbose=True,
                allow_delegation=False,
                tools=[self.search_tool, self.web_tool, *get_integration_tools('hr_ops')],
                llm=self._llm,
                **self._agent_kwargs('hr_ops'),
            )
        return self._agents['hr_ops']

    # ── 8. Deep Research Agent ────────────────────────────────

    @property
    def deep_research(self) -> Agent:
        if 'deep_research' not in self._agents:
            self._agents['deep_research'] = Agent(
                role='Deep Research Analyst',
                goal=(
                    'Conduct thorough, multi-source internet research on any topic and '
                    'produce a comprehensive, well-structured research report with '
                    'citations, key findings, data points, and strategic implications. '
                    'Leave no stone unturned — go deep, not shallow.'
                ),
                backstory=(
                    'You are an elite research analyst inside Engram with the mindset of a '
                    'McKinsey consultant and the thoroughness of an academic researcher. '
                    'You never stop at the first result — you cross-reference multiple sources, '
                    'verify facts, identify contradictions, and synthesize raw information into '
                    'structured, insightful reports. You search the web extensively, visit '
                    'actual pages to extract details, and always cite your sources with the '
                    'publication name and date. Your reports follow a tight structure: '
                    'Executive Summary → Key Findings → Data & Evidence → '
                    'Expert Perspectives → Risks & Counterarguments → Strategic Implications. '
                    'You write for founders who need clarity and depth, not fluff.'
                ),
                verbose=True,
                allow_delegation=False,
                tools=[self.search_tool, self.web_tool],
                llm=self._llm,
                max_iter=15,
                **self._agent_kwargs('deep_research'),
            )
        return self._agents['deep_research']

    # ── Lookup helper ─────────────────────────────────────────

    def get_agent(self, agent_type: str) -> Agent:
        mapping = {
            'orchestrator':        self.orchestrator,
            'sales':               self.sales,
            'customer_service':    self.customer_service,
            'technical':           self.technical,
            'market_intelligence': self.market_intelligence,
            'meeting':             self.meeting,
            'hr_ops':              self.hr_ops,
            'deep_research':       self.deep_research,
        }
        if agent_type not in mapping:
            raise ValueError(
                f"Unknown agent type: '{agent_type}'. "
                f"Valid types: {list(mapping.keys())}"
            )
        return mapping[agent_type]

    def all_types(self) -> list:
        return [
            'orchestrator', 'sales', 'customer_service',
            'technical', 'market_intelligence', 'meeting', 'hr_ops',
            'deep_research',
        ]
