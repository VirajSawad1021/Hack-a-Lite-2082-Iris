"""
Slack integration tools for NexOS agents.

Required env vars:
  SLACK_BOT_TOKEN   — Bot User OAuth Token (xoxb-...)
  SLACK_DEFAULT_CHANNEL — fallback channel name, e.g. "#general"

Scopes needed on your Slack App:
  chat:write, channels:read, channels:history, groups:history
"""

import os
from typing import Type
from pydantic import BaseModel, Field
from crewai.tools import BaseTool


def _slack_client():
    """Return an authenticated Slack WebClient or raise a clear error."""
    token = os.getenv("SLACK_BOT_TOKEN")
    if not token:
        raise EnvironmentError(
            "SLACK_BOT_TOKEN is not set. "
            "Add it to Crew/backend/.env to enable Slack integration."
        )
    from slack_sdk import WebClient
    return WebClient(token=token)


# ── Post Message ──────────────────────────────────────────────

class _PostInput(BaseModel):
    channel: str = Field(
        default="",
        description=(
            "Slack channel name (e.g. '#general') or channel ID. "
            "Leave blank to use SLACK_DEFAULT_CHANNEL env var."
        ),
    )
    message: str = Field(..., description="The message text to post.")


class SlackPostMessageTool(BaseTool):
    name: str = "slack_post_message"
    description: str = (
        "Post a message to a Slack channel. "
        "Use this to send updates, alerts, or summaries to the team."
    )
    args_schema: Type[BaseModel] = _PostInput

    def _run(self, message: str, channel: str = "") -> str:
        target = channel or os.getenv("SLACK_DEFAULT_CHANNEL", "#general")
        try:
            client = _slack_client()
            result = client.chat_postMessage(channel=target, text=message)
            ts = result.get("ts", "?")
            return f"✅ Message posted to {target} (ts={ts})"
        except EnvironmentError as e:
            return f"[Slack not configured] {e}"
        except Exception as e:
            return f"[Slack error] {e}"


# ── Read Messages ─────────────────────────────────────────────

class _ReadInput(BaseModel):
    channel: str = Field(
        default="",
        description="Channel name or ID. Blank = SLACK_DEFAULT_CHANNEL.",
    )
    limit: int = Field(default=10, le=50, description="Number of messages to fetch (max 50).")


class SlackReadMessagesTool(BaseTool):
    name: str = "slack_read_messages"
    description: str = (
        "Read the most recent messages from a Slack channel. "
        "Use this to catch up on team discussions or check for updates."
    )
    args_schema: Type[BaseModel] = _ReadInput

    def _run(self, channel: str = "", limit: int = 10) -> str:
        target = channel or os.getenv("SLACK_DEFAULT_CHANNEL", "#general")
        try:
            client = _slack_client()
            # Resolve channel name → ID if needed
            channel_id = target
            if target.startswith("#"):
                resp = client.conversations_list(types="public_channel,private_channel")
                for ch in resp.get("channels", []):
                    if ch["name"] == target.lstrip("#"):
                        channel_id = ch["id"]
                        break

            history = client.conversations_history(channel=channel_id, limit=limit)
            msgs = history.get("messages", [])
            if not msgs:
                return f"No messages found in {target}."

            lines = [f"Recent messages in {target}:"]
            for m in reversed(msgs):
                user = m.get("user", "bot")
                text = m.get("text", "").replace("\n", " ")[:200]
                lines.append(f"  [{user}]: {text}")
            return "\n".join(lines)
        except EnvironmentError as e:
            return f"[Slack not configured] {e}"
        except Exception as e:
            return f"[Slack error] {e}"


# ── List Channels ─────────────────────────────────────────────

class _ListInput(BaseModel):
    pass  # no parameters needed


class SlackListChannelsTool(BaseTool):
    name: str = "slack_list_channels"
    description: str = (
        "List all available Slack channels in the workspace. "
        "Use this to discover channel names before posting."
    )
    args_schema: Type[BaseModel] = _ListInput

    def _run(self) -> str:
        try:
            client = _slack_client()
            resp = client.conversations_list(
                types="public_channel,private_channel",
                limit=100,
            )
            channels = resp.get("channels", [])
            if not channels:
                return "No channels found."
            names = [f"#{c['name']} (id={c['id']})" for c in channels]
            return "Available Slack channels:\n" + "\n".join(names)
        except EnvironmentError as e:
            return f"[Slack not configured] {e}"
        except Exception as e:
            return f"[Slack error] {e}"
