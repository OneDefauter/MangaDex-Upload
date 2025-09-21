from __future__ import annotations
from flask import g
from flask_socketio import emit
from app.src.logging import logger
from app.src.path import DB_PATH
from app.src.SocketIO import socket
from app.src.database.db import open_db, list_jobs, fetch_job, tx
from app.src.services.language import t, get_effective_lang

ALLOWED_ORDER_COLS = {'priority', 'ordem', 'created_at', 'updated_at', 'id'}
VALID_TABLES = ("downloads", "uploads")


def get_conn():
    if 'db' not in g:
        g.db = open_db(DB_PATH)
    return g.db


def _emit_update(table: str, job_id: str):
    conn = get_conn()
    item = fetch_job(conn, table, job_id)
    socket.emit("jobs_changed", {
        "table": table,
        "change": {"type": "update", "item": item, "id": job_id}
    })


def parse_order(order_str: str) -> list[str]:
    """
    Converte "priority DESC,ordem ASC" -> ["priority DESC", "ordem ASC"],
    mantendo só colunas/direções permitidas.
    """
    out = []
    if not order_str:
        return out
    for piece in order_str.split(','):
        piece = piece.strip()
        if not piece:
            continue
        tokens = piece.split()
        col = tokens[0].strip()
        if col not in ALLOWED_ORDER_COLS:
            continue
        dir_ = tokens[1].upper() if len(tokens) > 1 else 'ASC'
        dir_ = 'DESC' if dir_ == 'DESC' else 'ASC'
        out.append(f"{col} {dir_}")
    return out


@socket.on("jobs_list")
def handle_jobs_list(payload):
    """
    payload: {
      "table": "downloads"|"uploads",
      "limit": 50,
      "offset": 0,
      "statuses": ["queued","running",...],  # opcional
      "order": "priority DESC,ordem ASC,id ASC"
    }
    """
    table = (payload or {}).get("table", "downloads")
    if table not in VALID_TABLES:
        return emit("jobs_page", {
            "table": table,
            "items": [],
            "total": 0,
            "limit": 0,
            "offset": 0
        })

    statuses = (payload or {}).get("statuses") or None
    try:
        limit = max(0, int((payload or {}).get("limit", 50)))
        offset = max(0, int((payload or {}).get("offset", 0)))
    except (ValueError, TypeError):
        limit, offset = 50, 0

    order_str = (payload or {}).get("order") or "priority DESC,ordem ASC,id ASC"
    order_by = parse_order(order_str) or ["priority DESC", "ordem ASC", "id ASC"]

    conn = get_conn()

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

    emit("jobs_page", {
        "table": table,
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset
    })


@socket.on("job_action")
def handle_job_action(payload):
    lang = get_effective_lang()
    try:
        action = (payload or {}).get("action")
        table = (payload or {}).get("table")
        job_id = (payload or {}).get("id")

        if table not in VALID_TABLES:
            return {"ok": False, "error": t(lang, "socket.queue.errors.table_invalid", namespace="app",
                                            default_value="Invalid table")}
        if action not in ("bump", "cancel", "retry", "remove"):
            return {"ok": False, "error": t(lang, "socket.queue.errors.action_invalid", namespace="app",
                                            default_value="Invalid action")}

        conn = get_conn()
        cur = conn.cursor()

        if action == "bump":
            delta = int((payload or {}).get("delta") or 0)
            with tx(conn) as tcur:
                tcur.execute(
                    f"UPDATE {table} "
                    f"SET priority = priority + ?, updated_at=datetime('now') "
                    f"WHERE id = ?",
                    (delta, job_id)
                )
                if tcur.getconnection().changes() == 0:
                    return {"ok": False, "error": t(lang, "socket.queue.errors.job_not_found", namespace="app",
                                                    default_value="Job not found")}
            _emit_update(table, job_id)
            item = fetch_job(conn, table, job_id)
            return {"ok": True, "item": item}

        if action == "cancel":
            with tx(conn) as tcur:
                tcur.execute(
                    f"""
                    UPDATE {table}
                       SET status='canceled',
                           worker_id=NULL,
                           lease_until=NULL,
                           updated_at=datetime('now')
                     WHERE id=?
                    """,
                    (job_id,)
                )
                if tcur.getconnection().changes() == 0:
                    return {"ok": False, "error": t(lang, "socket.queue.errors.job_not_found", namespace="app",
                                                    default_value="Job not found")}
            _emit_update(table, job_id)
            item = fetch_job(conn, table, job_id)
            return {"ok": True, "item": item}

        if action == "retry":
            with tx(conn) as tcur:
                tcur.execute(
                    f"""
                    UPDATE {table}
                       SET status='queued',
                           progress_bp=0,
                           last_error=NULL,
                           worker_id=NULL,
                           claimed_at=NULL,
                           lease_until=NULL,
                           updated_at=datetime('now')
                     WHERE id=?
                    """,
                    (job_id,)
                )
                if tcur.getconnection().changes() == 0:
                    return {"ok": False, "error": t(lang, "socket.queue.errors.job_not_found", namespace="app",
                                                    default_value="Job not found")}
            _emit_update(table, job_id)
            item = fetch_job(conn, table, job_id)
            return {"ok": True, "item": item}

        if action == "remove":
            row = cur.execute(f"SELECT status FROM {table} WHERE id=?", (job_id,)).fetchone()
            if not row:
                return {"ok": False, "error": t(lang, "socket.queue.errors.job_not_found", namespace="app",
                                                default_value="Job not found")}
            if row[0] == "running":
                return {"ok": False, "error": t(lang, "socket.queue.errors.cannot_remove_running", namespace="app",
                                                default_value="Cannot remove a running job; cancel it first")}

            with tx(conn) as tcur:
                tcur.execute(f"DELETE FROM {table} WHERE id=?", (job_id,))
            socket.emit("jobs_changed", {"table": table, "change": {"type": "delete", "id": job_id}})
            return {"ok": True}

    except Exception as e:
        logger.exception(t(lang, "socket.queue.log.job_action_failed", namespace="app",
                           default_value="job_action failed"))
        return {"ok": False, "error": str(e)}
