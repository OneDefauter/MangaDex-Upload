from __future__ import annotations
import apsw, uuid
from typing import Iterable, Dict, Any
from app.src.database.helpers.conn import tx
from app.src.SocketIO import socket

def _json(obj) -> str:
    import json as _j
    return _j.dumps(obj, ensure_ascii=False, separators=(",", ":"))

def uploads_enqueue_one(
    conn: apsw.Connection,
    *,
    projeto: str | None = None,
    projeto_id: str | None = None,
    idioma: str | None = None,
    grupos: Iterable[str] | None = None,
    titulo: str | None = None,
    capitulo: str | None = None,
    volume: str | None = None,
    one_shot: bool = False,
    long_strip: bool = False,
    path: str = "",
    path_temp: str | None = None,
    schedule_at: str | None = None,
    files_count: int | None = None,
    priority: int = 0,
) -> str:
    grupos_json = _json(list(grupos)) if grupos else None
    uid = uuid.uuid4().hex

    with tx(conn) as cur:
        row = cur.execute("SELECT COALESCE(MAX(ordem), 0) FROM uploads").fetchone()
        next_ordem = int(row[0] or 0) + 1

        cur.execute("""
            INSERT INTO uploads
              (id, ordem,
               projeto, projeto_id, idioma, grupo,
               titulo, capitulo, volume, one_shot,
               long_strip, path, path_temp, schedule_at,
               progress_bp, priority, status,
               retries, attempts, files_count,
               created_at, updated_at)
            VALUES
              (?,?,?,?,?,
               ?,?,?,?,?,
               ?,?,?,?,
               0, ?, 'queued',
               0, 0, ?,
               datetime('now'), datetime('now'))
        """, (
            uid, next_ordem,
            projeto, projeto_id, idioma, grupos_json,
            titulo, capitulo, volume, (1 if one_shot else 0),
            (1 if long_strip else 0), path, path_temp, schedule_at,
            int(priority), int(files_count or 0)
        ))

    socket.emit("jobs_changed", {"table": "uploads", "change": {"type": "refresh"}})
    return uid

_UPLOADS_UPDATABLE_COLS = {
    "projeto", "projeto_id", "idioma", "grupo",
    "titulo", "capitulo", "volume", "one_shot",
    "long_strip", "path", "path_temp", "schedule_at",
    "progress_bp", "priority", "status",
    "retries", "attempts",
    "files_count",
    "last_error"
}

def uploads_update_fields(conn: apsw.Connection, upload_id: str, fields: Dict[str, Any]) -> int:
    if not upload_id or not isinstance(fields, dict) or not fields:
        return 0

    sets, params = [], []

    if "grupos" in fields and "grupo" not in fields:
        fields = dict(fields)
        fields["grupo"] = fields.pop("grupos")

    if "last_error" in fields:
        fields = dict(fields)
        fields["last_error"] = _json(fields["last_error"])

    for col, val in fields.items():
        if col not in _UPLOADS_UPDATABLE_COLS:
            continue
        if col == "grupo":
            if isinstance(val, (list, tuple, set)):
                val = _json(list(val))
        elif col == "one_shot":
            val = 1 if bool(val) else 0
        elif col == "long_strip":
            val = 1 if bool(val) else 0
        elif col in ("progress_bp", "priority", "files_count", "retries", "attempts"):
            try:
                val = int(val)
            except Exception:
                val = 0
        sets.append(f"{col}=?")
        params.append(val)

    if not sets:
        return 0

    sets.append('updated_at=datetime("now")')

    before = conn.changes()
    with tx(conn) as cur:
        cur.execute(f"UPDATE uploads SET {', '.join(sets)} WHERE id=?", (*params, upload_id))
    after = conn.changes()
    changed = max(0, after - before)

    try:
        socket.emit("jobs_changed", {
            "table": "uploads",
            "change": {"type": "update", "id": upload_id,
                       "fields": [c.split('=')[0] for c in sets if '=' in c and not c.startswith('updated_at')]}
        })
    except Exception:
        pass

    return changed
