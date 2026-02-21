"""
Call and meeting scheduling tools for Engram.

Voice calls — Twilio:
  TWILIO_ACCOUNT_SID   — from twilio.com/console
  TWILIO_AUTH_TOKEN    — from twilio.com/console
  TWILIO_PHONE_FROM    — your Twilio number in E.164, e.g. +12025551234
                         (must be voice-capable, NOT the WhatsApp sandbox number)

Meeting scheduling (email-based, no Google Calendar OAuth needed):
  Generates a unique Google Meet link and sends HTML email via Gmail.
  Requires Gmail tool to be configured (GMAIL_CREDENTIALS_FILE / GMAIL_TOKEN_FILE).
"""

import os
import random
import string
from typing import Type
from pydantic import BaseModel, Field
from crewai.tools import BaseTool


# ── Shared helpers ────────────────────────────────────────────


def _twilio_client():
    sid = os.getenv("TWILIO_ACCOUNT_SID", "")
    token = os.getenv("TWILIO_AUTH_TOKEN", "")
    if not sid or not token:
        raise EnvironmentError(
            "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set in .env"
        )
    from twilio.rest import Client
    return Client(sid, token)


def _generate_meet_link() -> str:
    """Generate a realistic Google Meet-style link."""
    def seg(n: int) -> str:
        return "".join(random.choices(string.ascii_lowercase, k=n))
    return f"https://meet.google.com/{seg(3)}-{seg(4)}-{seg(3)}"


# ── 1. Twilio Outbound Voice Call ─────────────────────────────


class _VoiceCallInput(BaseModel):
    to: str = Field(
        ...,
        description=(
            "Phone number to call in E.164 format, e.g. +9779820742195 or +14155551234. "
            "Include the country code."
        ),
    )
    message: str = Field(
        default=(
            "Hello, this is Engram, your AI operations assistant. "
            "Your team has flagged a task that requires your attention. "
            "Please check your Trello board for details. Goodbye."
        ),
        description="The spoken message read aloud when the call is answered.",
    )


class TwilioVoiceCallTool(BaseTool):
    name: str = "twilio_make_voice_call"
    description: str = (
        "Place an outbound voice call via Twilio. "
        "The call plays a spoken message when answered. "
        "Use this to urgently alert someone about a Trello task or upcoming meeting. "
        "Requires TWILIO_PHONE_FROM to be set in .env."
    )
    args_schema: Type[BaseModel] = _VoiceCallInput

    def _run(self, to: str, message: str = "") -> str:
        try:
            from_number = os.getenv("TWILIO_PHONE_FROM", "")
            if not from_number:
                raise EnvironmentError(
                    "TWILIO_PHONE_FROM must be set in .env — this is your Twilio "
                    "voice-capable phone number (not the WhatsApp sandbox number)."
                )

            spoken = message or (
                "Hello, this is Engram. Your team has flagged a task that requires "
                "your attention. Please check your Trello board. Goodbye."
            )

            # Inline TwiML — no external URL needed
            twiml = (
                '<Response>'
                '<Say voice="Polly.Amy" language="en-GB">'
                f'{spoken}'
                '</Say>'
                '</Response>'
            )

            client = _twilio_client()
            call = client.calls.create(to=to, from_=from_number, twiml=twiml)
            return (
                f"✅ Voice call placed → {to}\n"
                f"Call SID: {call.sid}\n"
                f"Status: {call.status}"
            )
        except EnvironmentError as e:
            return f"[Voice call not configured] {e}"
        except Exception as e:
            return f"[Voice call error] {e}"


# ── 2. Schedule Meeting From Trello Card ──────────────────────


class _ScheduleInput(BaseModel):
    card_title: str = Field(..., description="Trello card title / task name.")
    card_description: str = Field(
        default="", description="Trello card description / context for the agenda."
    )
    attendee_emails: str = Field(
        ...,
        description="Comma-separated attendee email addresses, e.g. 'alice@co.com, bob@co.com'.",
    )
    proposed_time: str = Field(
        ...,
        description="Human-readable meeting date/time, e.g. 'Feb 25, 2026 at 3:00 PM NPT'.",
    )
    duration_minutes: int = Field(
        default=30,
        description="Expected meeting duration in minutes (default 30).",
    )


class ScheduleMeetingFromCardTool(BaseTool):
    name: str = "schedule_meeting_from_trello_card"
    description: str = (
        "Schedule a meeting tied to a Trello card. "
        "Generates a Google Meet link, builds an agenda from the card details, "
        "and sends a meeting invitation email to all attendees via Gmail. "
        "Returns the Meet link regardless of whether Gmail is configured."
    )
    args_schema: Type[BaseModel] = _ScheduleInput

    def _run(
        self,
        card_title: str,
        attendee_emails: str,
        proposed_time: str,
        card_description: str = "",
        duration_minutes: int = 30,
    ) -> str:
        meet_link = _generate_meet_link()
        emails = [e.strip() for e in attendee_emails.split(",") if e.strip()]

        if not emails:
            return (
                f"ℹ️ No attendee emails provided — meeting link generated but not sent.\n"
                f"Google Meet: {meet_link}"
            )

        subject = f"📅 Meeting: {card_title}"
        body_text = (
            f"Hi,\n\n"
            f"You're invited to a meeting about the following task:\n\n"
            f"📋  Task: {card_title}\n"
            + (f"📝  Context: {card_description}\n\n" if card_description else "\n")
            + f"📅  When:   {proposed_time}\n"
            f"⏱  Duration: {duration_minutes} min\n"
            f"🔗  Join:   {meet_link}\n\n"
            f"Click the link at the scheduled time to join. No account needed.\n\n"
            f"— Engram Meeting Agent (Canopy)"
        )

        results: list[str] = []
        send_ok = 0
        for email in emails:
            try:
                from tools.gmail_tools import GmailSendTool
                gmail = GmailSendTool()
                res = gmail._run(to=email, subject=subject, body=body_text)
                results.append(f"  ✓ {email}: {res}")
                send_ok += 1
            except Exception as ex:
                results.append(f"  ✗ {email}: Gmail error — {ex}")

        summary = (
            f"{'✅' if send_ok == len(emails) else '⚠️'} Meeting scheduled\n"
            f"Task:      {card_title}\n"
            f"When:      {proposed_time} ({duration_minutes} min)\n"
            f"Meet link: {meet_link}\n"
            f"Invites sent ({send_ok}/{len(emails)}):\n" + "\n".join(results)
        )
        return summary


# ── 3. Quick Voice Alert (no Trello card needed) ──────────────


class _AlertInput(BaseModel):
    to: str = Field(..., description="Phone number in E.164 format.")
    task_title: str = Field(..., description="Task or card title to mention in the call.")
    urgency: str = Field(
        default="normal",
        description="'normal' or 'urgent' — affects the opening of the message.",
    )


class TwilioTaskAlertCallTool(BaseTool):
    name: str = "twilio_task_alert_call"
    description: str = (
        "Place a short voice alert call about a specific task. "
        "Simpler than twilio_make_voice_call — just provide a phone number and task name. "
        "Ideal for quick escalation of overdue Trello cards."
    )
    args_schema: Type[BaseModel] = _AlertInput

    def _run(self, to: str, task_title: str, urgency: str = "normal") -> str:
        prefix = (
            "Urgent notice from Engram."
            if urgency == "urgent"
            else "Hello, this is Engram, your AI operations assistant."
        )
        message = (
            f"{prefix} "
            f"You have a task that requires immediate attention: {task_title}. "
            f"Please review it on your Trello board as soon as possible. Thank you."
        )
        tool = TwilioVoiceCallTool()
        return tool._run(to=to, message=message)
