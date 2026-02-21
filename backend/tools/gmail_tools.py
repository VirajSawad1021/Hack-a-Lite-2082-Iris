"""
Gmail integration tools for NexOS agents.

Required setup (one-time):
  1. Go to https://console.cloud.google.com → APIs & Services → Credentials
  2. Create an OAuth 2.0 Client ID (Desktop app)
  3. Download and save as  Crew/backend/credentials.json
  4. On first backend start the OAuth consent screen will open in your browser.
     After approval, token.json is saved automatically for future runs.

Required env vars (optional — fall back to defaults below):
  GMAIL_CREDENTIALS_PATH  path to credentials.json  (default: credentials.json)
  GMAIL_TOKEN_PATH        path to token.json         (default: token.json)

Gmail API OAuth Scopes used:
  https://www.googleapis.com/auth/gmail.modify
"""

import os
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Type
from pydantic import BaseModel, Field
from crewai.tools import BaseTool

SCOPES = ["https://www.googleapis.com/auth/gmail.modify"]

# Use absolute paths so the backend works regardless of cwd
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_CREDS_PATH = lambda: os.getenv("GMAIL_CREDENTIALS_PATH", os.path.join(_BACKEND_DIR, "credentials.json"))
_TOKEN_PATH = lambda: os.getenv("GMAIL_TOKEN_PATH", os.path.join(_BACKEND_DIR, "token.json"))


def _gmail_service():
    """Build and return an authenticated Gmail API service."""
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build

    creds = None
    token_path = _TOKEN_PATH()
    creds_path = _CREDS_PATH()

    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(creds_path):
                raise FileNotFoundError(
                    f"Gmail credentials not found at '{creds_path}'. "
                    "Download credentials.json from Google Cloud Console and "
                    "place it in Crew/backend/."
                )
            flow = InstalledAppFlow.from_client_secrets_file(creds_path, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(token_path, "w") as f:
            f.write(creds.to_json())

    return build("gmail", "v1", credentials=creds)


# ── Send Email ────────────────────────────────────────────────

class _SendInput(BaseModel):
    to: str = Field(..., description="Recipient email address.")
    subject: str = Field(..., description="Email subject line.")
    body: str = Field(..., description="Plain-text email body.")
    cc: str = Field(default="", description="Optional CC addresses (comma-separated).")


class GmailSendTool(BaseTool):
    name: str = "gmail_send_email"
    description: str = (
        "Send an email via Gmail. "
        "Use for outreach, follow-ups, confirmations, or any email communication."
    )
    args_schema: Type[BaseModel] = _SendInput

    def _run(self, to: str, subject: str, body: str, cc: str = "") -> str:
        try:
            service = _gmail_service()
            msg = MIMEMultipart("alternative")
            msg["To"] = to
            msg["Subject"] = subject
            if cc:
                msg["Cc"] = cc
            msg.attach(MIMEText(body, "plain"))
            raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
            service.users().messages().send(
                userId="me", body={"raw": raw}
            ).execute()
            return f"✅ Email sent to {to} | Subject: {subject}"
        except FileNotFoundError as e:
            return f"[Gmail not configured] {e}"
        except Exception as e:
            return f"[Gmail error] {e}"


# ── Create Draft ──────────────────────────────────────────────

class _DraftInput(BaseModel):
    to: str = Field(..., description="Recipient email address.")
    subject: str = Field(..., description="Draft subject line.")
    body: str = Field(..., description="Draft body text.")


class GmailDraftTool(BaseTool):
    name: str = "gmail_create_draft"
    description: str = (
        "Create an email draft in Gmail without sending it. "
        "Use when you want to prepare an email for human review before sending."
    )
    args_schema: Type[BaseModel] = _DraftInput

    def _run(self, to: str, subject: str, body: str) -> str:
        try:
            service = _gmail_service()
            msg = MIMEText(body)
            msg["To"] = to
            msg["Subject"] = subject
            raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
            draft = service.users().drafts().create(
                userId="me", body={"message": {"raw": raw}}
            ).execute()
            draft_id = draft.get("id", "?")
            return f"✅ Draft created (id={draft_id}) | To: {to} | Subject: {subject}"
        except FileNotFoundError as e:
            return f"[Gmail not configured] {e}"
        except Exception as e:
            return f"[Gmail error] {e}"


# ── Read / Search Emails ──────────────────────────────────────

class _ReadInput(BaseModel):
    query: str = Field(
        default="is:inbox",
        description=(
            "Gmail search query (same syntax as Gmail search bar). "
            "Examples: 'from:john@example.com', 'subject:invoice is:unread', 'is:starred'"
        ),
    )
    max_results: int = Field(default=5, le=20, description="Max emails to return.")


class GmailReadTool(BaseTool):
    name: str = "gmail_read_emails"
    description: str = (
        "Search and read emails from Gmail. "
        "Use to find specific emails, check for replies, or review inbox."
    )
    args_schema: Type[BaseModel] = _ReadInput

    def _run(self, query: str = "is:inbox", max_results: int = 5) -> str:
        try:
            service = _gmail_service()
            results = service.users().messages().list(
                userId="me", q=query, maxResults=max_results
            ).execute()
            messages = results.get("messages", [])
            if not messages:
                return f"No emails found for query: '{query}'"

            output = [f"Emails matching '{query}':"]
            for msg_ref in messages:
                msg = service.users().messages().get(
                    userId="me", id=msg_ref["id"], format="metadata",
                    metadataHeaders=["From", "Subject", "Date"],
                ).execute()
                headers = {h["name"]: h["value"] for h in msg["payload"]["headers"]}
                snippet = msg.get("snippet", "")[:150]
                output.append(
                    f"\n  From: {headers.get('From', '?')}"
                    f"\n  Subject: {headers.get('Subject', '?')}"
                    f"\n  Date: {headers.get('Date', '?')}"
                    f"\n  Preview: {snippet}"
                )
            return "\n".join(output)
        except FileNotFoundError as e:
            return f"[Gmail not configured] {e}"
        except Exception as e:
            return f"[Gmail error] {e}"
