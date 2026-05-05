"""Client Delivery System (Iter 55)

End-to-end client onboarding + delivery workspace, triggered when a deal closes
(via Stripe checkout.session.completed OR ops_lead status → won).

Endpoints under `/api/client`:
  Founder/Employee (auth):
    POST /onboard-from-lead     - manual trigger (auto-runs on lead close-won too)
    POST /list                  - list all clients (filtered by status)
    POST /workspace             - founder view of a client (full read)
    POST /set-status            - founder updates client status
    POST /task-toggle           - founder toggles a checklist task done/undone
    POST /resend-magic          - re-send magic link to client

  Public (magic-token gated):
    POST /portal/access         - exchange client_token for workspace + tasks + messages
    POST /portal/upload         - upload a file (base64, ≤5 MB)
    POST /portal/message        - client posts a message (founder gets notified)

Helpers exported for server.py:
    auto_onboard_from_lead(db, lead_id) - idempotent. Called by Stripe webhook on close-won
                                          and by ops_center when status flips to "won".
    notify_founder_event(...)            - thin wrapper around send_founder_notification.

Storage: 4 collections — `client_accounts`, `client_tasks`, `client_messages`,
`client_uploads`. All read filtered by `client_id` + ownership; never expose `_id`.
"""
from __future__ import annotations

import os
import uuid
import base64
import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List, Callable, Awaitable

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

log = logging.getLogger("client_delivery")

# ---------- Default workflow checklist (Section 6) ----------
DEFAULT_TASKS = [
    {"key": "intake_received",   "title": "Intake received",    "order": 1},
    {"key": "strategy_defined",  "title": "Strategy defined",   "order": 2},
    {"key": "setup_complete",    "title": "Setup complete",     "order": 3},
    {"key": "first_execution",   "title": "First execution",    "order": 4},
    {"key": "review",            "title": "Review",             "order": 5},
    {"key": "optimization",      "title": "Optimization",       "order": 6},
]

CLIENT_STATUSES = ("onboarding", "in_progress", "review", "completed", "inactive")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ──────────────── HELPER: auto-onboard from a closed-won lead ────────────────
async def auto_onboard_from_lead(
    db,
    lead_id: str,
    *,
    trigger: str = "stripe_close_won",
    override_email: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Idempotent: creates a `client_accounts` row + 6 default tasks + magic
    token for portal access. Returns the new client doc or the existing one.
    Returns None if the lead can't be found.
    """
    if not lead_id:
        return None

    # Idempotency: short-circuit if already onboarded
    existing = await db.client_accounts.find_one({"source_lead_id": lead_id}, {"_id": 0})
    if existing:
        return existing

    # Pull lead details from ops_leads (preferred) or legacy `leads`
    lead = await db.ops_leads.find_one({"lead_id": lead_id}, {"_id": 0}) \
        or await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        log.warning(f"auto_onboard_from_lead: lead {lead_id} not found in ops_leads or leads")
        return None

    contact_email = (override_email or lead.get("email") or lead.get("contact_email") or "").strip().lower()
    contact_name = lead.get("name") or lead.get("contact_name") or "Client"
    business_name = lead.get("company") or lead.get("business_name") or contact_name
    owner = lead.get("assigned_to_email") or lead.get("owner_user_id") or os.environ.get("FOUNDER_EMAIL", "")

    client_id = str(uuid.uuid4())
    client_token = secrets.token_urlsafe(32)
    now_s = _now_iso()
    doc = {
        "client_id": client_id,
        "client_token": client_token,
        "business_name": business_name,
        "contact_name": contact_name,
        "contact_email": contact_email,
        "source_lead_id": lead_id,
        "owner_user_id": owner,
        "status": "onboarding",
        "trigger": trigger,
        "deal_value_usd": lead.get("value_usd") or lead.get("closed_amount") or 0,
        "plan_key": lead.get("closed_plan_key"),
        "last_activity_at": now_s,
        "created_at": now_s,
        "updated_at": now_s,
    }
    await db.client_accounts.insert_one(dict(doc))
    doc.pop("_id", None)

    # Seed default tasks
    tasks_docs = [
        {
            "id": str(uuid.uuid4()),
            "client_id": client_id,
            "key": t["key"],
            "title": t["title"],
            "order": t["order"],
            "status": "pending",
            "completed_at": None,
            "created_at": now_s,
            "updated_at": now_s,
        }
        for t in DEFAULT_TASKS
    ]
    if tasks_docs:
        await db.client_tasks.insert_many([dict(t) for t in tasks_docs])

    # Seed welcome message from "delivery assistant"
    welcome = {
        "id": str(uuid.uuid4()),
        "client_id": client_id,
        "author": "delivery_ai",
        "author_name": "CreatorBoostAI Delivery",
        "body": (
            f"Welcome {contact_name}. Your project is now active. "
            "Use this portal to upload files, ask questions, and track every step. "
            "First task: send through your intake info or any docs you'd like reviewed."
        ),
        "created_at": now_s,
    }
    await db.client_messages.insert_one(dict(welcome))

    return doc


# ──────────────── REQUEST MODELS ────────────────
class _Auth(BaseModel):
    email: str
    token: str


class OnboardFromLead(_Auth):
    lead_id: str = Field(min_length=1)
    override_email: Optional[str] = None


class ListReq(_Auth):
    status: Optional[str] = None  # filter by status
    limit: int = Field(default=200, ge=1, le=500)


class WorkspaceReq(_Auth):
    client_id: str


class SetStatusReq(_Auth):
    client_id: str
    status: str


class TaskToggleReq(_Auth):
    client_id: str
    task_key: str
    done: bool


class ResendMagicReq(_Auth):
    client_id: str


class PortalAccess(BaseModel):
    client_id: str
    client_token: str = Field(min_length=8, max_length=128)


class PortalUpload(PortalAccess):
    filename: str = Field(min_length=1, max_length=240)
    mimetype: str = Field(min_length=1, max_length=120)
    content_b64: str = Field(min_length=1)
    note: Optional[str] = Field(default=None, max_length=2000)


class PortalMessage(PortalAccess):
    body: str = Field(min_length=1, max_length=4000)


class FounderReplyReq(_Auth):
    client_id: str
    body: str = Field(min_length=1, max_length=4000)


# ──────────────── ROUTER ────────────────
def make_client_delivery_router(
    db,
    require_any_role: Callable[..., Awaitable[Dict[str, Any]]],
    require_founder: Callable[..., Awaitable[Dict[str, Any]]],
    *,
    notify_founder: Optional[Callable[..., Awaitable[None]]] = None,
    site_url_env: str = "SITE_URL",
) -> APIRouter:
    router = APIRouter(prefix="/api/client", tags=["client-delivery"])

    async def _bump_activity(client_id: str) -> None:
        await db.client_accounts.update_one(
            {"client_id": client_id},
            {"$set": {"last_activity_at": _now_iso(), "updated_at": _now_iso()}},
        )

    async def _client_or_404(client_id: str) -> Dict[str, Any]:
        doc = await db.client_accounts.find_one({"client_id": client_id}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Client not found")
        return doc

    async def _validate_magic(client_id: str, token: str) -> Dict[str, Any]:
        doc = await _client_or_404(client_id)
        if not secrets.compare_digest(str(doc.get("client_token", "")), str(token)):
            raise HTTPException(401, "Invalid client token")
        if doc.get("status") == "inactive":
            raise HTTPException(403, "Client portal is inactive")
        return doc

    async def _safe_notify(subject: str, body: str) -> None:
        if not notify_founder:
            return
        try:
            await notify_founder(subject=subject, body=body)
        except Exception as e:
            log.error(f"notify_founder failed: {e}")

    # ──────────── FOUNDER / EMPLOYEE ENDPOINTS ────────────
    @router.post("/onboard-from-lead")
    async def onboard_from_lead(payload: OnboardFromLead):
        user = await require_any_role(payload)
        # employees can onboard their own leads only
        lead = await db.ops_leads.find_one({"lead_id": payload.lead_id}, {"_id": 0})
        if not lead:
            raise HTTPException(404, "Lead not found")
        if user["role"] == "employee" and lead.get("assigned_to_email") != user["email"]:
            raise HTTPException(403, "Not your lead")

        doc = await auto_onboard_from_lead(
            db, payload.lead_id, trigger="manual_button", override_email=payload.override_email
        )
        if not doc:
            raise HTTPException(500, "Could not onboard client")

        # Send magic-link to client
        await _send_magic_link(db, doc, site_url_env=site_url_env)
        await _safe_notify(
            subject=f"New client onboarded · {doc['business_name']}",
            body=f"{doc['contact_name']} ({doc['contact_email']}) just kicked off their delivery workspace. "
                 f"Trigger: {doc['trigger']}. Open: /portal/ops → Clients tab.",
        )
        return {"ok": True, "client": _strip_token(doc)}

    @router.post("/list")
    async def client_list(payload: ListReq):
        user = await require_any_role(payload)
        q: Dict[str, Any] = {}
        if user["role"] == "employee":
            q["owner_user_id"] = user["email"]
        if payload.status and payload.status in CLIENT_STATUSES:
            q["status"] = payload.status

        cursor = db.client_accounts.find(q, {"_id": 0, "client_token": 0}).sort("created_at", -1).limit(payload.limit)
        rows = await cursor.to_list(payload.limit)

        # Enrich: open_tasks count + last message preview
        for r in rows:
            cid = r["client_id"]
            r["tasks_open"] = await db.client_tasks.count_documents({"client_id": cid, "status": "pending"})
            r["tasks_done"] = await db.client_tasks.count_documents({"client_id": cid, "status": "done"})
            r["uploads_count"] = await db.client_uploads.count_documents({"client_id": cid})
            r["messages_count"] = await db.client_messages.count_documents({"client_id": cid})
        # Counts for sidebar pills
        counts = {
            "all": await db.client_accounts.count_documents({} if user["role"] != "employee" else {"owner_user_id": user["email"]}),
        }
        for s in CLIENT_STATUSES:
            base = {"status": s} if user["role"] != "employee" else {"status": s, "owner_user_id": user["email"]}
            counts[s] = await db.client_accounts.count_documents(base)
        return {"clients": rows, "counts": counts}

    @router.post("/workspace")
    async def workspace(payload: WorkspaceReq):
        user = await require_any_role(payload)
        client = await _client_or_404(payload.client_id)
        if user["role"] == "employee" and client.get("owner_user_id") != user["email"]:
            raise HTTPException(403, "Not your client")

        tasks = await db.client_tasks.find({"client_id": payload.client_id}, {"_id": 0}) \
            .sort("order", 1).to_list(50)
        messages = await db.client_messages.find({"client_id": payload.client_id}, {"_id": 0}) \
            .sort("created_at", 1).to_list(500)
        uploads = await db.client_uploads.find(
            {"client_id": payload.client_id},
            {"_id": 0, "content_b64": 0},  # never ship raw bytes in list
        ).sort("created_at", -1).to_list(200)

        return {
            "client": _strip_token(client),
            "tasks": tasks,
            "messages": messages,
            "uploads": uploads,
            "magic_link": _build_magic_url(client, site_url_env=site_url_env),
        }

    @router.post("/set-status")
    async def set_status(payload: SetStatusReq):
        await require_founder(payload)
        if payload.status not in CLIENT_STATUSES:
            raise HTTPException(400, f"Invalid status. Allowed: {CLIENT_STATUSES}")
        result = await db.client_accounts.find_one_and_update(
            {"client_id": payload.client_id},
            {"$set": {"status": payload.status, "updated_at": _now_iso()}},
            projection={"_id": 0},
            return_document=True,
        )
        if not result:
            raise HTTPException(404, "Client not found")
        return {"ok": True, "client": _strip_token(result)}

    @router.post("/task-toggle")
    async def task_toggle(payload: TaskToggleReq):
        user = await require_any_role(payload)
        client = await _client_or_404(payload.client_id)
        if user["role"] == "employee" and client.get("owner_user_id") != user["email"]:
            raise HTTPException(403, "Not your client")

        new_status = "done" if payload.done else "pending"
        completed_at = _now_iso() if payload.done else None
        await db.client_tasks.update_one(
            {"client_id": payload.client_id, "key": payload.task_key},
            {"$set": {"status": new_status, "completed_at": completed_at, "updated_at": _now_iso()}},
        )
        await _bump_activity(payload.client_id)

        # Auto-status sync (Section 7)
        await _sync_status_from_tasks(db, payload.client_id)
        updated = await db.client_accounts.find_one({"client_id": payload.client_id}, {"_id": 0})
        return {"ok": True, "client": _strip_token(updated or {})}

    @router.post("/resend-magic")
    async def resend_magic(payload: ResendMagicReq):
        await require_founder(payload)
        client = await _client_or_404(payload.client_id)
        await _send_magic_link(db, client, site_url_env=site_url_env)
        return {"ok": True, "delivered_to": client.get("contact_email")}

    # ──────────── PUBLIC PORTAL ENDPOINTS (magic-token gated) ────────────
    @router.post("/portal/access")
    async def portal_access(payload: PortalAccess):
        client = await _validate_magic(payload.client_id, payload.client_token)
        tasks = await db.client_tasks.find({"client_id": payload.client_id}, {"_id": 0}) \
            .sort("order", 1).to_list(50)
        messages = await db.client_messages.find({"client_id": payload.client_id}, {"_id": 0}) \
            .sort("created_at", 1).to_list(500)
        uploads = await db.client_uploads.find(
            {"client_id": payload.client_id},
            {"_id": 0, "content_b64": 0},
        ).sort("created_at", -1).to_list(200)
        return {
            "client": _strip_token(client),
            "tasks": tasks,
            "messages": messages,
            "uploads": uploads,
        }

    @router.post("/portal/upload")
    async def portal_upload(payload: PortalUpload):
        client = await _validate_magic(payload.client_id, payload.client_token)
        # 5 MB cap on raw bytes
        try:
            raw = base64.b64decode(payload.content_b64, validate=True)
        except Exception:
            raise HTTPException(400, "Invalid base64 content")
        if len(raw) > 5 * 1024 * 1024:
            raise HTTPException(413, "File too large (max 5 MB)")

        doc = {
            "id": str(uuid.uuid4()),
            "client_id": client["client_id"],
            "filename": payload.filename,
            "mimetype": payload.mimetype,
            "size_bytes": len(raw),
            "content_b64": payload.content_b64,
            "note": payload.note,
            "uploaded_by": "client",
            "created_at": _now_iso(),
        }
        await db.client_uploads.insert_one(dict(doc))
        await _bump_activity(client["client_id"])
        await _safe_notify(
            subject=f"Client upload · {client['business_name']}",
            body=f"{client['contact_name']} uploaded `{payload.filename}` ({len(raw)} bytes). "
                 f"Open the Clients tab in /portal/ops to review.",
        )
        doc.pop("content_b64")  # don't echo back
        return {"ok": True, "upload": doc}

    @router.post("/portal/message")
    async def portal_message(payload: PortalMessage):
        client = await _validate_magic(payload.client_id, payload.client_token)
        msg = {
            "id": str(uuid.uuid4()),
            "client_id": client["client_id"],
            "author": "client",
            "author_name": client["contact_name"],
            "body": payload.body,
            "created_at": _now_iso(),
        }
        await db.client_messages.insert_one(dict(msg))
        await _bump_activity(client["client_id"])
        await _safe_notify(
            subject=f"Client message · {client['business_name']}",
            body=f"{client['contact_name']}: {payload.body[:240]}",
        )
        return {"ok": True, "message": msg}

    # Founder-side message reply
    @router.post("/reply")
    async def founder_reply(payload: FounderReplyReq):
        user = await require_any_role(payload)
        client = await _client_or_404(payload.client_id)
        if user["role"] == "employee" and client.get("owner_user_id") != user["email"]:
            raise HTTPException(403, "Not your client")
        msg = {
            "id": str(uuid.uuid4()),
            "client_id": payload.client_id,
            "author": "founder" if user["role"] == "founder" else user["role"],
            "author_name": user.get("name") or user["email"],
            "body": payload.body,
            "created_at": _now_iso(),
        }
        await db.client_messages.insert_one(dict(msg))
        await _bump_activity(payload.client_id)
        return {"ok": True, "message": msg}

    # Section 8: inactive-check endpoint (founder polls or cron calls)
    @router.post("/inactive-flag-check")
    async def inactive_flag_check(payload: _Auth):
        await require_founder(payload)
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
        cursor = db.client_accounts.find(
            {"status": {"$in": ["onboarding", "in_progress", "review"]},
             "last_activity_at": {"$lt": cutoff}},
            {"_id": 0},
        )
        flagged: List[str] = []
        async for c in cursor:
            await db.client_accounts.update_one(
                {"client_id": c["client_id"]},
                {"$set": {"inactivity_flagged_at": _now_iso(), "updated_at": _now_iso()}},
            )
            flagged.append(c["client_id"])
            await _safe_notify(
                subject=f"Inactive client · {c['business_name']}",
                body=f"{c['contact_name']} has not had any activity in 48h. "
                     f"Last activity: {c.get('last_activity_at')}. Status: {c['status']}.",
            )
        return {"ok": True, "flagged_count": len(flagged), "flagged": flagged}

    return router


# ──────────────── INTERNAL HELPERS ────────────────
def _strip_token(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Never echo the client_token to founder-list responses (it's the magic key)."""
    return {k: v for k, v in doc.items() if k != "client_token"}


def _build_magic_url(client: Dict[str, Any], *, site_url_env: str = "SITE_URL") -> str:
    base = (os.environ.get(site_url_env, "") or "").rstrip("/")
    if not base:
        base = "https://creatorboostai.com"
    return f"{base}/portal/client/{client['client_id']}?token={client.get('client_token')}"


async def _send_magic_link(db, client: Dict[str, Any], *, site_url_env: str = "SITE_URL") -> Dict[str, Any]:
    """Best-effort email of the magic link via Resend. Always logs to
    `client_magic_link_log` so the founder can resend manually if mail fails."""
    url = _build_magic_url(client, site_url_env=site_url_env)
    record = {
        "id": str(uuid.uuid4()),
        "client_id": client["client_id"],
        "to": client.get("contact_email"),
        "url": url,
        "created_at": _now_iso(),
        "delivered_ok": False,
    }
    try:
        from email_service import send_with_result  # type: ignore
        subj = f"Your CreatorBoostAI client portal · {client.get('business_name', '')}"
        html = (
            f"<p>Hi {client.get('contact_name', '')},</p>"
            f"<p>Your project workspace is ready. Open it any time:</p>"
            f"<p><a href='{url}' style='background:#06b6d4;color:#0c1117;"
            f"padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600'>"
            f"Open my portal</a></p>"
            f"<p style='color:#64748b'>Or paste this link: {url}</p>"
        )
        plain = f"Your CreatorBoostAI client portal: {url}"
        ok = False
        try:
            res = await send_with_result(client["contact_email"], subj, html, plain)
            ok = bool(res.get("ok") or res.get("delivered"))
        except TypeError:
            # send_with_result may be sync
            res = send_with_result(client["contact_email"], subj, html, plain)  # type: ignore
            ok = bool(res.get("ok") or res.get("delivered"))
        record["delivered_ok"] = ok
        record["provider_response"] = res
    except Exception as e:
        log.warning(f"_send_magic_link: email failed: {e}")
        record["error"] = str(e)
    await db.client_magic_link_log.insert_one(dict(record))
    return record


async def _sync_status_from_tasks(db, client_id: str) -> None:
    """Section 7: tasks-driven status auto-sync.
       0 done → onboarding, 1-2 done → in_progress, 3-4 → review, all done → completed.
       Doesn't override manual `inactive` flag."""
    total = await db.client_tasks.count_documents({"client_id": client_id})
    done = await db.client_tasks.count_documents({"client_id": client_id, "status": "done"})
    doc = await db.client_accounts.find_one({"client_id": client_id}, {"_id": 0, "status": 1})
    if not doc or doc.get("status") == "inactive":
        return
    if total == 0:
        return
    if done == 0:
        new_status = "onboarding"
    elif done < total // 2:
        new_status = "in_progress"
    elif done < total:
        new_status = "review"
    else:
        new_status = "completed"
    if new_status != doc.get("status"):
        await db.client_accounts.update_one(
            {"client_id": client_id},
            {"$set": {"status": new_status, "updated_at": _now_iso()}},
        )


__all__ = [
    "make_client_delivery_router",
    "auto_onboard_from_lead",
    "DEFAULT_TASKS",
    "CLIENT_STATUSES",
]
