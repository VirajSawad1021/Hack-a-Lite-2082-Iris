"""
Trello integration tools for Engram agents.

Required env vars:
  TRELLO_API_KEY   — from https://trello.com/app-key
  TRELLO_TOKEN     — generate at https://trello.com/app-key (click "Token" link)

All tools degrade gracefully when credentials are missing.
"""

import os
from typing import Type
from pydantic import BaseModel, Field
from crewai.tools import BaseTool


# ── Shared helpers ────────────────────────────────────────────


def _creds():
    key = os.getenv("TRELLO_API_KEY", "")
    token = os.getenv("TRELLO_TOKEN", "")
    if not key or not token:
        raise EnvironmentError(
            "TRELLO_API_KEY and TRELLO_TOKEN must be set in .env. "
            "Get them at https://trello.com/app-key"
        )
    return key, token


def _get(path: str, params: dict = {}) -> list | dict:
    import requests
    key, token = _creds()
    resp = requests.get(
        f"https://api.trello.com/1/{path}",
        params={"key": key, "token": token, **params},
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()


def _post(path: str, data: dict = {}) -> dict:
    import requests
    key, token = _creds()
    resp = requests.post(
        f"https://api.trello.com/1/{path}",
        params={"key": key, "token": token},
        json=data,
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()


# ── 1. List Boards ────────────────────────────────────────────


class _Empty(BaseModel):
    pass


class TrelloListBoardsTool(BaseTool):
    name: str = "trello_list_boards"
    description: str = (
        "List all active Trello boards for the authenticated user. "
        "Returns board names and IDs needed for other Trello tools."
    )
    args_schema: Type[BaseModel] = _Empty

    def _run(self) -> str:
        try:
            boards = _get("members/me/boards", {"fields": "name,id,url,closed"})
            active = [b for b in boards if not b.get("closed")]
            if not active:
                return "No active Trello boards found."
            lines = [f"• {b['name']}  (id: {b['id']})" for b in active]
            return "Trello Boards:\n" + "\n".join(lines)
        except EnvironmentError as e:
            return f"[Trello not configured] {e}"
        except Exception as e:
            return f"[Trello error] {e}"


# ── 2. Get Cards From a Board ─────────────────────────────────


class _BoardInput(BaseModel):
    board_id: str = Field(..., description="Trello board ID (from trello_list_boards).")


class TrelloGetBoardCardsTool(BaseTool):
    name: str = "trello_get_board_cards"
    description: str = (
        "Get all cards from a Trello board grouped by list. "
        "Returns card name, ID, due date, assignees, and short URL."
    )
    args_schema: Type[BaseModel] = _BoardInput

    def _run(self, board_id: str) -> str:
        try:
            cards = _get(
                f"boards/{board_id}/cards",
                {
                    "fields": "name,desc,due,idList,idMembers,shortUrl,labels",
                    "members": "true",
                    "member_fields": "fullName,username",
                },
            )
            lists_raw = _get(f"boards/{board_id}/lists", {"fields": "name"})
            list_names = {lst["id"]: lst["name"] for lst in lists_raw}

            if not cards:
                return "No cards found on this board."

            lines: list[str] = []
            for c in cards[:40]:
                due = (c.get("due") or "no due date")[:10] if c.get("due") else "no due date"
                lst = list_names.get(c.get("idList", ""), "?")
                members_raw = c.get("members") or []
                assignees = ", ".join(
                    m.get("fullName") or m.get("username", "?") for m in members_raw
                ) or "unassigned"
                lines.append(
                    f"[{lst}] {c['name']}  |  id: {c['id']}  |  due: {due}"
                    f"  |  assignees: {assignees}  |  {c.get('shortUrl', '')}"
                )
            return "\n".join(lines)
        except EnvironmentError as e:
            return f"[Trello not configured] {e}"
        except Exception as e:
            return f"[Trello error] {e}"


# ── 3. Get Full Card Details ──────────────────────────────────


class _CardInput(BaseModel):
    card_id: str = Field(..., description="Trello card ID.")


class TrelloGetCardDetailsTool(BaseTool):
    name: str = "trello_get_card_details"
    description: str = (
        "Get full details of a Trello card: description, checklists, latest comments, "
        "assignees, due date, and any phone numbers or emails mentioned in the description."
    )
    args_schema: Type[BaseModel] = _CardInput

    def _run(self, card_id: str) -> str:
        try:
            card = _get(
                f"cards/{card_id}",
                {
                    "fields": "name,desc,due,shortUrl,idBoard",
                    "members": "true",
                    "member_fields": "fullName,username",
                    "checklists": "all",
                    "actions": "commentCard",
                    "actions_limit": "5",
                },
            )
            lines = [
                f"Card:  {card['name']}",
                f"URL:   {card.get('shortUrl', '')}",
                f"Due:   {(card.get('due') or 'no due date')[:19]}",
                f"\nDescription:\n{card.get('desc') or '(empty)'}",
            ]

            members = card.get("members") or []
            if members:
                names = ", ".join(m.get("fullName") or m.get("username", "?") for m in members)
                lines.append(f"\nAssignees: {names}")

            for cl in (card.get("checklists") or []):
                lines.append(f"\nChecklist — {cl['name']}:")
                for item in cl.get("checkItems", []):
                    tick = "✓" if item["state"] == "complete" else "○"
                    lines.append(f"  {tick} {item['name']}")

            comments = [a for a in (card.get("actions") or []) if a["type"] == "commentCard"]
            if comments:
                lines.append("\nLatest comments:")
                for a in comments[:5]:
                    who = a["memberCreator"]["fullName"]
                    text = a["data"]["text"][:200]
                    lines.append(f"  [{who}] {text}")

            return "\n".join(lines)
        except EnvironmentError as e:
            return f"[Trello not configured] {e}"
        except Exception as e:
            return f"[Trello error] {e}"


# ── 4. Add Comment to Card ────────────────────────────────────


class _CommentInput(BaseModel):
    card_id: str = Field(..., description="Trello card ID.")
    comment: str = Field(..., description="Comment text to add.")


class TrelloCommentCardTool(BaseTool):
    name: str = "trello_add_comment"
    description: str = (
        "Add a comment to a Trello card. "
        "Use this to log call scheduling, meeting links, or agent summaries back to the card."
    )
    args_schema: Type[BaseModel] = _CommentInput

    def _run(self, card_id: str, comment: str) -> str:
        try:
            _post(f"cards/{card_id}/actions/comments", {"text": comment})
            return f"✅ Comment added to card {card_id}"
        except EnvironmentError as e:
            return f"[Trello not configured] {e}"
        except Exception as e:
            return f"[Trello error] {e}"


# ── 5. Move Card to List ──────────────────────────────────────


class _MoveInput(BaseModel):
    card_id: str = Field(..., description="Trello card ID to move.")
    list_id: str = Field(..., description="Target list ID to move the card into.")


class TrelloMoveCardTool(BaseTool):
    name: str = "trello_move_card"
    description: str = (
        "Move a Trello card to a different list (e.g., from 'To Do' to 'In Progress' "
        "after a call is scheduled)."
    )
    args_schema: Type[BaseModel] = _MoveInput

    def _run(self, card_id: str, list_id: str) -> str:
        try:
            import requests
            key, token = _creds()
            resp = requests.put(
                f"https://api.trello.com/1/cards/{card_id}",
                params={"key": key, "token": token},
                json={"idList": list_id},
                timeout=10,
            )
            resp.raise_for_status()
            return f"✅ Card {card_id} moved to list {list_id}"
        except EnvironmentError as e:
            return f"[Trello not configured] {e}"
        except Exception as e:
            return f"[Trello error] {e}"
