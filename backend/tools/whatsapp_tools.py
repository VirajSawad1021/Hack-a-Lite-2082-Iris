"""
WhatsApp integration tools for NexOS agents via Twilio.

Required env vars:
  TWILIO_ACCOUNT_SID      — from twilio.com/console
  TWILIO_AUTH_TOKEN       — from twilio.com/console
  TWILIO_WHATSAPP_FROM    — your Twilio sandbox/business number e.g. whatsapp:+14155238886
  TWILIO_WHATSAPP_TO      — default recipient number e.g. whatsapp:+9779820742195

Sandbox setup (already done):
  From: whatsapp:+14155238886  (Twilio sandbox)
  To:   whatsapp:+9779820742195

For templates (business-initiated messages), pass content_sid + content_variables.
For free-form replies (within 24h window after user messages you), just pass body text.
"""

import os
from typing import Type
from pydantic import BaseModel, Field
from crewai.tools import BaseTool


def _twilio_client():
    sid   = os.getenv("TWILIO_ACCOUNT_SID")
    token = os.getenv("TWILIO_AUTH_TOKEN")
    if not sid or not token:
        raise EnvironmentError(
            "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set in .env "
            "to enable WhatsApp integration."
        )
    from twilio.rest import Client
    return Client(sid, token)


def _from_number() -> str:
    return os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")


def _to_number(override: str = "") -> str:
    num = override.strip() or os.getenv("TWILIO_WHATSAPP_TO", "")
    if not num:
        raise ValueError("No recipient number provided and TWILIO_WHATSAPP_TO is not set.")
    # Normalise — ensure whatsapp: prefix
    if not num.startswith("whatsapp:"):
        num = f"whatsapp:{num}"
    return num


# ── Send Free-Form Message ────────────────────────────────────

class _SendInput(BaseModel):
    message: str = Field(..., description="The WhatsApp message text to send.")
    to: str = Field(
        default="",
        description=(
            "Recipient phone number with country code, e.g. +9779820742195. "
            "Leave blank to use TWILIO_WHATSAPP_TO env var. "
            "Note: free-form messages only work within 24h of the user messaging you first (sandbox rule)."
        ),
    )


class WhatsAppSendTool(BaseTool):
    name: str = "whatsapp_send_message"
    description: str = (
        "Send a WhatsApp message to a phone number via Twilio. "
        "Use to notify a user, send a report, alert, or follow-up over WhatsApp. "
        "Free-form text works within 24h of the user initiating contact. "
        "For first-contact use whatsapp_send_template instead."
    )
    args_schema: Type[BaseModel] = _SendInput

    def _run(self, message: str, to: str = "") -> str:
        try:
            client = _twilio_client()
            msg = client.messages.create(
                from_=_from_number(),
                to=_to_number(to),
                body=message,
            )
            return f"✅ WhatsApp message sent (sid={msg.sid}) to {_to_number(to)}"
        except EnvironmentError as e:
            return f"[WhatsApp not configured] {e}"
        except Exception as e:
            return f"[WhatsApp error] {e}"


# ── Send Template Message (business-initiated) ────────────────

class _TemplateInput(BaseModel):
    to: str = Field(
        default="",
        description="Recipient phone number, e.g. +9779820742195. Blank = TWILIO_WHATSAPP_TO.",
    )
    date: str = Field(..., description="Appointment date, e.g. '12/1'.")
    time: str = Field(..., description="Appointment time, e.g. '3pm'.")


class WhatsAppTemplateTool(BaseTool):
    name: str = "whatsapp_send_appointment_reminder"
    description: str = (
        "Send a pre-approved WhatsApp appointment reminder template message. "
        "Use this for first-contact or business-initiated outreach (no 24h restriction). "
        "The message says: 'Your appointment is coming up on {date} at {time}. "
        "If you need to change it, please reply back and let us know.'"
    )
    args_schema: Type[BaseModel] = _TemplateInput

    # Twilio sandbox appointment template SID
    CONTENT_SID: str = "HXb5b62575e6e4ff6129ad7c8efe1f983e"

    def _run(self, date: str, time: str, to: str = "") -> str:
        try:
            import json
            client = _twilio_client()
            msg = client.messages.create(
                from_=_from_number(),
                to=_to_number(to),
                content_sid=self.CONTENT_SID,
                content_variables=json.dumps({"1": date, "2": time}),
            )
            return (
                f"✅ WhatsApp appointment reminder sent (sid={msg.sid}) | "
                f"date={date} time={time} → {_to_number(to)}"
            )
        except EnvironmentError as e:
            return f"[WhatsApp not configured] {e}"
        except Exception as e:
            return f"[WhatsApp error] {e}"


# ── Check Message Status ──────────────────────────────────────

class _StatusInput(BaseModel):
    message_sid: str = Field(..., description="The Twilio message SID to check status for.")


class WhatsAppStatusTool(BaseTool):
    name: str = "whatsapp_check_message_status"
    description: str = (
        "Check the delivery status of a previously sent WhatsApp message using its SID."
    )
    args_schema: Type[BaseModel] = _StatusInput

    def _run(self, message_sid: str) -> str:
        try:
            client = _twilio_client()
            msg = client.messages(message_sid).fetch()
            return (
                f"Message {message_sid}: status={msg.status}, "
                f"to={msg.to}, date_sent={msg.date_sent}, error={msg.error_message or 'none'}"
            )
        except EnvironmentError as e:
            return f"[WhatsApp not configured] {e}"
        except Exception as e:
            return f"[WhatsApp error] {e}"
