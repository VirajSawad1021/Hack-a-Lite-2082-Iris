"""
Notion integration tools for NexOS agents.

Required setup:
  1. Go to https://www.notion.so/my-integrations
  2. Create a new integration → copy the Internal Integration Token
  3. Share the pages/databases you want the agent to access:
       open page → "..." menu → Add connections → select your integration
  4. Set env vars below.

Required env vars:
  NOTION_TOKEN          — Integration secret (ntn_... or secret_...)
  NOTION_DEFAULT_PARENT — Page ID where new pages are created by default
                          (get it from the page URL: notion.so/<PAGE_ID>)
"""

import os
from typing import Type
from pydantic import BaseModel, Field
from crewai.tools import BaseTool


def _notion_client():
    token = os.getenv("NOTION_TOKEN")
    if not token:
        raise EnvironmentError(
            "NOTION_TOKEN is not set. "
            "Add it to Crew/backend/.env to enable Notion integration."
        )
    from notion_client import Client
    return Client(auth=token)


def _default_parent():
    """Return a Notion parent object — page or workspace root."""
    page_id = os.getenv("NOTION_DEFAULT_PARENT", "")
    if page_id:
        # Normalise dashes
        page_id = page_id.replace("-", "")
        return {"type": "page_id", "page_id": page_id}
    # Fall back to workspace root (requires workspace integration permissions)
    return {"type": "workspace", "workspace": True}


# ── Create Page ───────────────────────────────────────────────

class _CreatePageInput(BaseModel):
    title: str = Field(..., description="Page title.")
    content: str = Field(..., description="Page body content (plain text / markdown).")
    parent_page_id: str = Field(
        default="",
        description=(
            "Notion page ID to nest this page under. "
            "Leave blank to use NOTION_DEFAULT_PARENT env var."
        ),
    )


class NotionCreatePageTool(BaseTool):
    name: str = "notion_create_page"
    description: str = (
        "Create a new page in Notion with a title and content. "
        "Use to save meeting notes, reports, job descriptions, or any structured content."
    )
    args_schema: Type[BaseModel] = _CreatePageInput

    def _run(self, title: str, content: str, parent_page_id: str = "") -> str:
        try:
            notion = _notion_client()

            if parent_page_id:
                pid = parent_page_id.replace("-", "")
                parent = {"type": "page_id", "page_id": pid}
            else:
                parent = _default_parent()

            # Split content into blocks (max 2000 chars per rich_text object)
            blocks = []
            for para in content.split("\n\n"):
                para = para.strip()
                if not para:
                    continue
                chunks = [para[i : i + 2000] for i in range(0, len(para), 2000)]
                for chunk in chunks:
                    blocks.append(
                        {
                            "object": "block",
                            "type": "paragraph",
                            "paragraph": {
                                "rich_text": [
                                    {"type": "text", "text": {"content": chunk}}
                                ]
                            },
                        }
                    )

            page = notion.pages.create(
                parent=parent,
                properties={
                    "title": {
                        "title": [{"type": "text", "text": {"content": title}}]
                    }
                },
                children=blocks[:100],  # Notion API limit
            )
            return f"✅ Notion page created: {page.get('url', page['id'])}"
        except EnvironmentError as e:
            return f"[Notion not configured] {e}"
        except Exception as e:
            return f"[Notion error] {e}"


# ── Search Pages ──────────────────────────────────────────────

class _SearchInput(BaseModel):
    query: str = Field(..., description="Text to search for across Notion pages and databases.")
    page_size: int = Field(default=5, le=20, description="Max results to return.")


class NotionSearchTool(BaseTool):
    name: str = "notion_search"
    description: str = (
        "Search your Notion workspace for pages, documents, or databases by keyword. "
        "Use to find existing notes, SOPs, meeting records, or any stored content."
    )
    args_schema: Type[BaseModel] = _SearchInput

    def _run(self, query: str, page_size: int = 5) -> str:
        try:
            notion = _notion_client()
            results = notion.search(query=query, page_size=page_size).get("results", [])

            if not results:
                return f"No Notion pages found for: '{query}'"

            lines = [f"Notion search results for '{query}':"]
            for item in results:
                obj_type = item.get("object", "?")
                if obj_type == "page":
                    props = item.get("properties", {})
                    # Different page types store title differently
                    title = "Untitled"
                    for key in ["title", "Name", "Title"]:
                        if key in props:
                            rich = props[key].get("title", [])
                            if rich:
                                title = rich[0].get("plain_text", "Untitled")
                                break
                    url = item.get("url", "")
                    lines.append(f"  📄 {title} — {url}")
                elif obj_type == "database":
                    db_title = item.get("title", [{}])
                    name = db_title[0].get("plain_text", "Database") if db_title else "Database"
                    lines.append(f"  🗃️  {name} (database) — {item.get('url', '')}")

            return "\n".join(lines)
        except EnvironmentError as e:
            return f"[Notion not configured] {e}"
        except Exception as e:
            return f"[Notion error] {e}"


# ── Read Page ─────────────────────────────────────────────────

class _ReadPageInput(BaseModel):
    page_id: str = Field(
        ...,
        description=(
            "Notion page ID (from the page URL: notion.so/<PAGE_ID>). "
            "Dashes are optional."
        ),
    )


class NotionReadPageTool(BaseTool):
    name: str = "notion_read_page"
    description: str = (
        "Read the full text content of a specific Notion page by its ID. "
        "Use after notion_search to read the full content of a result."
    )
    args_schema: Type[BaseModel] = _ReadPageInput

    def _run(self, page_id: str) -> str:
        try:
            notion = _notion_client()
            pid = page_id.replace("-", "").strip()

            # Fetch page metadata
            page = notion.pages.retrieve(page_id=pid)
            props = page.get("properties", {})
            title = "Untitled"
            for key in ["title", "Name", "Title"]:
                if key in props:
                    rich = props[key].get("title", [])
                    if rich:
                        title = rich[0].get("plain_text", "Untitled")
                        break

            # Fetch content blocks
            blocks = notion.blocks.children.list(block_id=pid).get("results", [])
            lines = [f"# {title}\n"]
            for block in blocks:
                btype = block.get("type", "")
                data = block.get(btype, {})
                rich_text = data.get("rich_text", [])
                text = "".join(rt.get("plain_text", "") for rt in rich_text)
                if text.strip():
                    if btype.startswith("heading"):
                        prefix = "#" * int(btype[-1])
                        lines.append(f"{prefix} {text}")
                    elif btype == "bulleted_list_item":
                        lines.append(f"• {text}")
                    elif btype == "numbered_list_item":
                        lines.append(f"1. {text}")
                    else:
                        lines.append(text)

            return "\n".join(lines) if len(lines) > 1 else f"Page '{title}' appears to be empty."
        except EnvironmentError as e:
            return f"[Notion not configured] {e}"
        except Exception as e:
            return f"[Notion error] {e}"
