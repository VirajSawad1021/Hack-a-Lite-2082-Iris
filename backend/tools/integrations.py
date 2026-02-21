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
  meeting             → Slack (post), Gmail (read), Notion (create, read, search),
                        Trello (list boards, get cards, card details, comment, move),
                        Call tools (voice call, schedule meeting, task alert)
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
# Trello
_trello_boards    = None
_trello_cards     = None
_trello_card_det  = None
_trello_comment   = None
_trello_move      = None
# Call tools
_voice_call       = None
_schedule_meeting = None
_task_alert       = None


def _get(name: str):
    """Lazy-initialise and cache tool instances."""
    global _slack_post, _slack_read, _slack_list
    global _gmail_send, _gmail_draft, _gmail_read
    global _notion_create, _notion_search, _notion_read
    global _wa_send, _wa_template, _wa_status
    global _trello_boards, _trello_cards, _trello_card_det, _trello_comment, _trello_move
    global _voice_call, _schedule_meeting, _task_alert

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
    # Trello
    if name == "trello_boards"   and _trello_boards   is None:
        from tools.trello_tools import TrelloListBoardsTool
        _trello_boards   = TrelloListBoardsTool()
    if name == "trello_cards"    and _trello_cards    is None:
        from tools.trello_tools import TrelloGetBoardCardsTool
        _trello_cards    = TrelloGetBoardCardsTool()
    if name == "trello_card_det" and _trello_card_det is None:
        from tools.trello_tools import TrelloGetCardDetailsTool
        _trello_card_det = TrelloGetCardDetailsTool()
    if name == "trello_comment"  and _trello_comment  is None:
        from tools.trello_tools import TrelloCommentCardTool
        _trello_comment  = TrelloCommentCardTool()
    if name == "trello_move"     and _trello_move     is None:
        from tools.trello_tools import TrelloMoveCardTool
        _trello_move     = TrelloMoveCardTool()
    # Call tools
    if name == "voice_call"       and _voice_call       is None:
        from tools.call_tools import TwilioVoiceCallTool
        _voice_call       = TwilioVoiceCallTool()
    if name == "schedule_meeting" and _schedule_meeting is None:
        from tools.call_tools import ScheduleMeetingFromCardTool
        _schedule_meeting = ScheduleMeetingFromCardTool()
    if name == "task_alert"       and _task_alert       is None:
        from tools.call_tools import TwilioTaskAlertCallTool
        _task_alert       = TwilioTaskAlertCallTool()

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
        # Trello
        "trello_boards":   _trello_boards,
        "trello_cards":    _trello_cards,
        "trello_card_det": _trello_card_det,
        "trello_comment":  _trello_comment,
        "trello_move":     _trello_move,
        # Call tools
        "voice_call":       _voice_call,
        "schedule_meeting": _schedule_meeting,
        "task_alert":       _task_alert,
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
        # Trello integration
        "trello_boards", "trello_cards", "trello_card_det",
        "trello_comment", "trello_move",
        # Call / meeting scheduling
        "voice_call", "schedule_meeting", "task_alert",
    ],
    "hr_ops": [
        "gmail_send", "gmail_draft",
        "notion_create", "notion_search",
        "wa_send",
    ],
    "deep_research": [],  # only uses search + web tools from agents.py
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
    "deep_research":       [],
}


def get_enterprise_apps(agent_type: str) -> list[str]:
    """
    Return enterprise app names for apps=[] if the platform token is set.
    Returns an empty list (no-op) when the token is absent.
    """
    if not os.getenv("CREWAI_PLATFORM_INTEGRATION_TOKEN"):
        return []
    return _ENTERPRISE_APPS.get(agent_type, [])
