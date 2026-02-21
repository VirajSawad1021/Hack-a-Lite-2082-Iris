"""
Integration tool factory for NexOS agents.
──────────────────────────────────────────
Returns the right set of integration tools for each agent type.
Tools are lazy-initialised and degrade gracefully when credentials are missing.

Enterprise passthrough:
  If CREWAI_PLATFORM_INTEGRATION_TOKEN is set and crewai supports apps=[],
  the enterprise app names are also included on each agent.
  (Currently returned as metadata for agents.py to apply.)

Tool assignment by agent:
  orchestrator        → Slack (post, read, list), Notion (search, create)
  sales               → Gmail (send, draft, read), Notion (create, search)
  customer_service    → Gmail (send, draft, read), Notion (create, search)
  technical           → Slack (post), Notion (create, search)
  market_intelligence → (search/web already on agent — no extra integration tools)
  meeting             → Slack (post), Gmail (read), Notion (create, read, search)
  hr_ops              → Gmail (send, draft), Notion (create, search)
"""

import os


# ── Cached singleton instances (created once per process) ─────

_slack_post  = None
_slack_read  = None
_slack_list  = None
_gmail_send  = None
_gmail_draft = None
_gmail_read  = None
_notion_create    = None
_notion_search    = None
_notion_read      = None
_wa_send          = None
_wa_template      = None
_wa_status        = None


def _get(name: str):
    """Lazy-initialise and cache tool instances."""
    global _slack_post, _slack_read, _slack_list
    global _gmail_send, _gmail_draft, _gmail_read
    global _notion_create, _notion_search, _notion_read
    global _wa_send, _wa_template, _wa_status

    if name == "slack_post"    and _slack_post    is None:
        from tools.slack_tools import SlackPostMessageTool
        _slack_post    = SlackPostMessageTool()
    if name == "slack_read"    and _slack_read    is None:
        from tools.slack_tools import SlackReadMessagesTool
        _slack_read    = SlackReadMessagesTool()
    if name == "slack_list"    and _slack_list    is None:
        from tools.slack_tools import SlackListChannelsTool
        _slack_list    = SlackListChannelsTool()
    if name == "gmail_send"    and _gmail_send    is None:
        from tools.gmail_tools import GmailSendTool
        _gmail_send    = GmailSendTool()
    if name == "gmail_draft"   and _gmail_draft   is None:
        from tools.gmail_tools import GmailDraftTool
        _gmail_draft   = GmailDraftTool()
    if name == "gmail_read"    and _gmail_read    is None:
        from tools.gmail_tools import GmailReadTool
        _gmail_read    = GmailReadTool()
    if name == "notion_create" and _notion_create is None:
        from tools.notion_tools import NotionCreatePageTool
        _notion_create = NotionCreatePageTool()
    if name == "notion_search" and _notion_search is None:
        from tools.notion_tools import NotionSearchTool
        _notion_search = NotionSearchTool()
    if name == "notion_read"   and _notion_read   is None:
        from tools.notion_tools import NotionReadPageTool
        _notion_read   = NotionReadPageTool()
    if name == "wa_send"       and _wa_send       is None:
        from tools.whatsapp_tools import WhatsAppSendTool
        _wa_send       = WhatsAppSendTool()
    if name == "wa_template"   and _wa_template   is None:
        from tools.whatsapp_tools import WhatsAppTemplateTool
        _wa_template   = WhatsAppTemplateTool()
    if name == "wa_status"     and _wa_status     is None:
        from tools.whatsapp_tools import WhatsAppStatusTool
        _wa_status     = WhatsAppStatusTool()

    return {
        "slack_post":    _slack_post,
        "slack_read":    _slack_read,
        "slack_list":    _slack_list,
        "gmail_send":    _gmail_send,
        "gmail_draft":   _gmail_draft,
        "gmail_read":    _gmail_read,
        "notion_create": _notion_create,
        "notion_search": _notion_search,
        "notion_read":   _notion_read,
        "wa_send":       _wa_send,
        "wa_template":   _wa_template,
        "wa_status":     _wa_status,
    }[name]


# ── Tool sets per agent ───────────────────────────────────────

_AGENT_TOOLS: dict[str, list[str]] = {
    "orchestrator": [
        "slack_post", "slack_read", "slack_list",
        "notion_search", "notion_create",
        "wa_send",
    ],
    "sales": [
        "gmail_send", "gmail_draft", "gmail_read",
        "notion_create", "notion_search",
        "wa_send", "wa_template",
    ],
    "customer_service": [
        "gmail_send", "gmail_draft", "gmail_read",
        "notion_create", "notion_search",
        "wa_send", "wa_template", "wa_status",
    ],
    "technical": [
        "slack_post",
        "notion_create", "notion_search",
        "wa_send",
    ],
    "market_intelligence": [],  # search + web tools already assigned in agents.py
    "meeting": [
        "slack_post",
        "gmail_read",
        "notion_create", "notion_search", "notion_read",
        "wa_send", "wa_template",
    ],
    "hr_ops": [
        "gmail_send", "gmail_draft",
        "notion_create", "notion_search",
        "wa_send",
    ],
}


def get_integration_tools(agent_type: str) -> list:
    """
    Return a list of integration tool instances for the given agent type.
    Tools are skipped silently if their credentials aren't configured —
    the tool itself returns a helpful error string when called.
    """
    tool_names = _AGENT_TOOLS.get(agent_type, [])
    return [_get(name) for name in tool_names]


# ── Enterprise apps passthrough ───────────────────────────────
# Mapping from agent → CrewAI Enterprise app names (used with apps=[])
# Only active when CREWAI_PLATFORM_INTEGRATION_TOKEN is set.

_ENTERPRISE_APPS: dict[str, list[str]] = {
    "orchestrator":        ["slack", "notion"],
    "sales":               ["gmail", "gmail/send_email", "hubspot"],
    "customer_service":    ["gmail", "gmail/send_email", "zendesk"],
    "technical":           ["slack", "github", "notion"],
    "market_intelligence": [],
    "meeting":             ["slack", "gmail", "google_calendar", "notion"],
    "hr_ops":              ["gmail", "notion"],
}


def get_enterprise_apps(agent_type: str) -> list[str]:
    """
    Return enterprise app names for apps=[] if the platform token is set.
    Returns an empty list (no-op) when the token is absent.
    """
    if not os.getenv("CREWAI_PLATFORM_INTEGRATION_TOKEN"):
        return []
    return _ENTERPRISE_APPS.get(agent_type, [])
