# NexOS Integrations Setup Guide

This guide walks you through connecting Slack, Gmail, and Notion to your NexOS agents.
Each integration is **optional** — agents degrade gracefully if credentials are missing
(they return a clear error message instead of crashing).

---

## Quick Reference

| Service | Env Var | Which Agents |
|---------|---------|--------------|
| Slack   | `SLACK_BOT_TOKEN` | Orchestrator, Technical, Meeting |
| Gmail   | `credentials.json` file | Sales, Customer Service, Meeting, HR Ops |
| Notion  | `NOTION_TOKEN` | All except Market Intelligence |
| CrewAI Enterprise | `CREWAI_PLATFORM_INTEGRATION_TOKEN` | All (optional layer) |

---

## 1. Slack

**What it enables:** Post team updates, read channel history, list channels.

### Steps
1. Go to https://api.slack.com/apps → **Create New App** (From scratch)
2. Name it `NexOS`, select your workspace
3. Click **OAuth & Permissions** in the sidebar
4. Under **Bot Token Scopes**, add:
   - `chat:write`
   - `channels:read`
   - `channels:history`
   - `groups:history` (for private channels)
5. Click **Install to Workspace** → Authorize
6. Copy the **Bot User OAuth Token** (starts with `xoxb-`)
7. Add to `Crew/backend/.env`:
   ```
   SLACK_BOT_TOKEN=xoxb-your-token-here
   SLACK_DEFAULT_CHANNEL=#general
   ```
8. **Invite the bot to channels** it needs to access:
   In Slack, open the channel → `/invite @NexOS`

---

## 2. Gmail

**What it enables:** Send emails, create drafts, search/read inbox.

### Steps
1. Go to https://console.cloud.google.com
2. Create a new project (or use existing)
3. Enable the **Gmail API**: APIs & Services → Library → search "Gmail API" → Enable
4. Create credentials: APIs & Services → Credentials → **Create Credentials** → OAuth 2.0 Client ID
   - Application type: **Desktop app**
   - Name: `NexOS`
5. Download the JSON file, rename it to `credentials.json`, place it in `Crew/backend/`
6. Add to `Crew/backend/.env`:
   ```
   GMAIL_CREDENTIALS_PATH=credentials.json
   GMAIL_TOKEN_PATH=token.json
   ```
7. **First-time OAuth:** When an agent first uses Gmail, a browser window will open
   for consent. After approval, `token.json` is saved in `Crew/backend/` and
   future runs are fully automatic.

> **Tip:** The OAuth scope used is `gmail.modify` which allows reading and
> sending — not deleting. This is intentional for safety.

---

## 3. Notion

**What it enables:** Create pages (meeting notes, reports, job descriptions), search workspace, read page content.

### Steps
1. Go to https://www.notion.so/my-integrations
2. Click **+ New integration**
   - Name: `NexOS`
   - Associated workspace: your workspace
   - Capabilities: Read/Update/Insert content ✓
3. Click **Submit** → copy the **Internal Integration Secret** (starts with `ntn_` or `secret_`)
4. **Share pages with the integration** (required for each page/database):
   - Open the Notion page → click `...` (top right) → **Add connections** → select `NexOS`
5. Get the **Parent Page ID** for new pages:
   - Open the page in Notion → the URL is `notion.so/<PAGE_ID>`
   - Copy the 32-character hex string from the URL
6. Add to `Crew/backend/.env`:
   ```
   NOTION_TOKEN=ntn_your-token-here
   NOTION_DEFAULT_PARENT=your-32-char-page-id
   ```

---

## 4. CrewAI Enterprise (Optional)

If you have a CrewAI Enterprise account, you can additionally use the `apps=[]`
native integration layer which supports OAuth-scoped multi-user access.

1. Go to https://app.crewai.com/crewai_plus/connectors
2. Connect Gmail, Slack, HubSpot, GitHub, Notion, etc. via OAuth
3. Go to https://app.crewai.com/crewai_plus/settings/integrations → copy your Enterprise Token
4. Add to `Crew/backend/.env`:
   ```
   CREWAI_PLATFORM_INTEGRATION_TOKEN=your-enterprise-token-here
   ```

When this token is set, the `apps=[...]` parameter is automatically injected into
each agent, enabling the enterprise integration layer on top of the open-source tools.

---

## Tool Assignment per Agent

```
orchestrator        → Slack (post, read, list channels) + Notion (search, create)
sales               → Gmail (send, draft, read) + Notion (create, search)
customer_service    → Gmail (send, draft, read) + Notion (create, search)
technical           → Slack (post) + Notion (create, search)
market_intelligence → SerperDev + Web search (no extra integrations)
meeting             → Slack (post) + Gmail (read) + Notion (create, search, read)
hr_ops              → Gmail (send, draft) + Notion (create, search)
```

---

## Testing Integrations

Once credentials are set, test by asking an agent directly:

- **Slack**: `"Post a message to #general: NexOS is online"`
- **Gmail**: `"Draft an email to test@example.com about our Q1 launch"`
- **Notion**: `"Create a meeting notes page titled 'Weekly Sync - Feb 21'"`

If a credential is missing, the agent will report:
`"[Slack not configured] SLACK_BOT_TOKEN is not set."`
rather than crashing.
