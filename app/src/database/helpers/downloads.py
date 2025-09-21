from __future__ import annotations
import apsw, json
from typing import Dict, Any, Iterable, Sequence, Tuple
from app.src.database.helpers.conn import tx
from app.src.SocketIO import socket

def _json(obj) -> str:
    import json as _j
    return _j.dumps(obj, ensure_ascii=False, separators=(",", ":"))

def downloads_enqueue_bulk(
    conn: apsw.Connection,
    items: Iterable[Dict[str, Any]],
    *,
    projeto: str,
    projeto_id: str,
    base_path: str,
    default_priority: int = 0,
) -> Tuple[int, int]:
    inserted = 0
    skipped  = 0
    with tx(conn) as cur:
        row = cur.execute("SELECT COALESCE(MAX(ordem), 0) FROM downloads").fetchone()
        next_ordem = int(row[0] or 0) + 1

        for it in items:
            chap_id   = it.get("id")
            if not chap_id:
                skipped += 1
                continue
            grupo     = it.get("grupo") or None
            titulo    = it.get("titulo") or None
            capitulo  = it.get("capitulo") or None
            volume    = it.get("volume") or None
            idioma    = it.get("idioma") or None
            one_shot  = 1 if it.get("one_shot") else 0
            priority  = int(it.get("priority")) if it.get("priority") is not None else int(default_priority)

            cur.execute("""
                INSERT OR IGNORE INTO downloads
                (id, ordem, projeto, projeto_id, idioma, grupo, titulo, capitulo, volume,
                 one_shot, path, files, priority, status, progress_bp, retries, created_at, updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,
                        ?,?, '[]', ?, 'queued', 0, 0, datetime('now'), datetime('now'))
            """, (chap_id, next_ordem, projeto, projeto_id, idioma, grupo, titulo, capitulo, volume,
                  one_shot, base_path, priority))

            if cur.getconnection().changes() == 1:
                inserted += 1
                next_ordem += 1
            else:
                skipped  += 1

    socket.emit("jobs_changed", {"table": 'downloads', "change": {"type": "refresh"}})
    return inserted, skipped

def downloads_set_manifest(conn: apsw.Connection, job_id: str,
                           base_url: str, ch_hash: str, files: Sequence[str]):
    files_json = _json(list(files))
    with tx(conn) as cur:
        cur.execute("""
            UPDATE downloads
               SET path = ?, hash = ?, files = ?, updated_at = datetime('now')
             WHERE id = ?
        """, (base_url, ch_hash, files_json, job_id))

def downloads_get_manifest(conn: apsw.Connection, job_id: str):
    cur = conn.cursor()
    row = cur.execute("SELECT path, hash, files FROM downloads WHERE id = ?", (job_id,)).fetchone()
    if not row:
        return None
    base_url, ch_hash, files_json = row
    if not base_url or not ch_hash or not files_json:
        return None
    try:
        files = json.loads(files_json) if isinstance(files_json, str) else files_json
    except Exception:
        return None
    if not isinstance(files, list) or not files:
        return None
    return base_url, ch_hash, files
