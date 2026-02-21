"""
Startup company profile — loaded by agents and tasks to give every AI response
context about who the startup is, what they do, and for whom.

The profile is stored in company_profile.json next to this file.
Update it via the /api/company-profile PATCH endpoint (or edit the JSON directly).
"""

import json
from pathlib import Path

PROFILE_PATH = Path(__file__).parent / "company_profile.json"

FIELDS = [
    "company_name",
    "tagline",
    "industry",
    "stage",
    "product_description",
    "target_customers",
    "team_size",
    "key_differentiators",
    "competitors",
    "revenue_model",
]

DEFAULT_PROFILE: dict = {f: "" for f in FIELDS}


def load_profile() -> dict:
    """Load the company profile from disk. Returns defaults if not set."""
    if PROFILE_PATH.exists():
        try:
            data = json.loads(PROFILE_PATH.read_text(encoding="utf-8"))
            return {**DEFAULT_PROFILE, **data}
        except Exception:
            pass
    return dict(DEFAULT_PROFILE)


def save_profile(data: dict) -> dict:
    """Persist the company profile to disk. Returns the saved dict."""
    merged = {
        **DEFAULT_PROFILE,
        **{k: v or "" for k, v in data.items() if k in FIELDS},
    }
    PROFILE_PATH.write_text(
        json.dumps(merged, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    return merged


# Human-readable labels for the fields
_LABELS = {
    "company_name":        "Company",
    "tagline":             "Tagline",
    "industry":            "Industry",
    "stage":               "Stage",
    "product_description": "Product",
    "target_customers":    "Target Customers",
    "team_size":           "Team Size",
    "key_differentiators": "Key Differentiators",
    "competitors":         "Key Competitors",
    "revenue_model":       "Revenue Model",
}


def format_context() -> str:
    """
    Return a formatted context block ready to be prepended to any agent prompt.
    Returns an empty string if no meaningful profile has been set.
    """
    p = load_profile()
    lines = [
        f"{label}: {p[key]}"
        for key, label in _LABELS.items()
        if p.get(key)
    ]
    if not lines:
        return ""
    return (
        "=== YOUR STARTUP CONTEXT ===\n"
        + "\n".join(lines)
        + "\n=== USE THIS CONTEXT IN EVERY RESPONSE ===\n"
    )
