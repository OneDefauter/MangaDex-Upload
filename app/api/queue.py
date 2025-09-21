from __future__ import annotations
from flask import Blueprint, request, jsonify, abort
from typing import List

from app.src.database import conn
from app.src.database.db import list_jobs
from app.src.services.language import t, get_effective_lang

queue_api = Blueprint("queue_api", __name__, url_prefix="/api")

ALLOWED_TABLES = {"downloads", "uploads"}
PURGEABLE_STATUSES = {"queued", "error", "done", "canceled"}
ALLOWED_ORDER_COLS = {"priority", "ordem", "created_at", "updated_at", "id"}


def _assert_table(table: str):
    if table not in ALLOWED_TABLES:
        lang = get_effective_lang()
        msg = t(lang, "api.queue.errors.invalid_table", namespace="app", default_value="Invalid table")
        abort(400, description=msg)


def parse_order(order_str: str) -> List[str]:
    """
    Converte "priority DESC,ordem ASC" -> ["priority DESC", "ordem ASC"],
    mantendo só colunas/direções permitidas.
    """
    out: List[str] = []
    if not order_str:
        return out
    for piece in order_str.split(","):
        piece = piece.strip()
        if not piece:
            continue
        tokens = piece.split()
        col = tokens[0].strip()
        if col not in ALLOWED_ORDER_COLS:
            continue
        dir_ = tokens[1].upper() if len(tokens) > 1 else "ASC"
        dir_ = "DESC" if dir_ == "DESC" else "ASC"
        out.append(f"{col} {dir_}")
    return out


@queue_api.get("/jobs")
def api_jobs():
    table = request.args.get("table", "downloads")
    _assert_table(table)

    statuses = request.args.get("statuses")
    statuses = [s for s in (statuses or "").split(",") if s] or None

    try:
        limit  = max(0, int(request.args.get("limit", 50)))
        offset = max(0, int(request.args.get("offset", 0)))
    except ValueError:
        lang = get_effective_lang()
        msg = t(lang, "api.queue.errors.invalid_pagination", namespace="app", default_value="Invalid limit/offset")
        return jsonify({"error": msg}), 400

    order_str = request.args.get("order") or "priority DESC,ordem ASC,id ASC"
    order_by  = parse_order(order_str) or ["priority DESC", "ordem ASC", "id ASC"]

    # itens da página
    items = list_jobs(
        conn, table,
        statuses=statuses,
        limit=limit,
        offset=offset,
        order_by=order_by
    )

    # total com o mesmo filtro de status
    cur = conn.cursor()
    params = []
    where = ""
    if statuses:
        placeholders = ",".join("?" for _ in statuses)
        where = f"WHERE status IN ({placeholders})"
        params.extend(statuses)
    total = cur.execute(f"SELECT COUNT(*) FROM {table} {where}", params).fetchone()[0]

    resp = jsonify({"items": items, "total": total})
    resp.headers["X-Total-Count"] = str(total)
    return resp


@queue_api.get("/queue/stats")
def queue_stats():
    table = request.args.get("table", "")
    _assert_table(table)

    cur = conn.cursor()
    rows = list(cur.execute(f"SELECT status, COUNT(*) FROM {table} GROUP BY status"))
    counts = {status: int(cnt) for (status, cnt) in rows}
    total = sum(counts.values())
    return jsonify({"ok": True, "table": table, "counts": counts, "total": total})


@queue_api.post("/queue/purge")
def queue_purge():
    from app.src.SocketIO import socket  # importa aqui para evitar ciclos em alguns setups

    data = request.get_json(silent=True) or {}
    table = data.get("table", "")
    _assert_table(table)

    statuses = data.get("statuses") or list(PURGEABLE_STATUSES)
    statuses = [s for s in statuses if s in PURGEABLE_STATUSES]
    if not statuses:
        lang = get_effective_lang()
        msg = t(lang, "api.queue.errors.no_valid_status", namespace="app", default_value="No valid status to purge")
        return jsonify({"ok": False, "error": msg}), 400

    ph = ",".join(["?"] * len(statuses))
    cur = conn.cursor()
    cur.execute(f"DELETE FROM {table} WHERE status IN ({ph})", statuses)
    deleted = conn.changes()

    # Emite refresh para quem estiver na /queue (se Socket.IO estiver disponível)
    try:
        socket.emit("jobs_changed", {"table": table, "change": {"type": "refresh"}}, broadcast=True)
    except Exception:
        pass

    rows = list(cur.execute(f"SELECT status, COUNT(*) FROM {table} GROUP BY status"))
    counts = {status: int(cnt) for (status, cnt) in rows}
    total = sum(counts.values())

    return jsonify({"ok": True, "deleted": deleted, "table": table, "counts": counts, "total": total})
