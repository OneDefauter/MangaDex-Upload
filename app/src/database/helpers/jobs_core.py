from __future__ import annotations
import apsw, json, time, random
from typing import Any, Dict, Optional, Literal, Iterable, Sequence
from app.src.database.helpers.conn import tx, open_db
from app.src.SocketIO import socket

JobTable = Literal["downloads", "uploads"]
VALID_STATUSES = ("queued", "running", "done", "error", "canceled")

def _json(obj) -> str:
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))

def _table_cols(conn: apsw.Connection, table: JobTable) -> list[str]:
    cur = conn.cursor()
    return [r[1] for r in cur.execute(f"PRAGMA table_info({table})")]

def _rows_to_dicts(cols: list[str], rows: list[tuple]) -> list[Dict[str, Any]]:
    out: list[Dict[str, Any]] = []
    for row in rows:
        d = {col: row[i] for i, col in enumerate(cols)}
        try:
            d["files"] = json.loads(d.get("files") or "[]")
        except Exception:
            d["files"] = []
        if "one_shot" in d:
            d["one_shot"] = bool(d["one_shot"])
        out.append(d)
    return out

def _row_to_job(columns: list[str], row: tuple) -> Dict[str, Any]:
    d = {col: row[i] for i, col in enumerate(columns)}
    try:
        d["files"] = json.loads(d.get("files") or "[]")
    except Exception:
        d["files"] = []
    d["one_shot"] = bool(d.get("one_shot"))
    return d

def _emit_job_update(table: str, job_id: str):
    from app.src.path import DB_PATH  # evitar ciclo
    try:
        conn = open_db(DB_PATH)
        item = fetch_job(conn, table, job_id)
    except Exception:
        item = None
    socket.emit("jobs_changed", {
        "table": table,
        "change": {"type": "update", "item": item, "id": job_id}
    })

# genérico (se quiser)
def job_insert(conn: apsw.Connection, table: JobTable, *,
               ordem: int = 0, projeto: str|None = None, grupo: str|None = None,
               titulo: str|None = None, capitulo: str|None = None, volume: str|None = None,
               one_shot: bool = False, path: str = "", files: list[str] | None = None,
               priority: int = 0) -> int:
    assert table in ("downloads", "uploads")
    files = files or []
    with tx(conn) as cur:
        cur.execute(f"""
            INSERT INTO {table} (ordem, projeto, grupo, titulo, capitulo, volume,
                                 one_shot, path, files, priority)
            VALUES (?,?,?,?,?,?, ?,?,?,?)
        """, (ordem, projeto, grupo, titulo, capitulo, volume,
              1 if one_shot else 0, path, _json(files), priority))
        rowid = cur.getconnection().last_insert_rowid()
    return rowid

def job_update_progress(conn: apsw.Connection, table: JobTable, job_id: str, *,
                        progress_bp: int|None = None, status: str|None = None,
                        retries: int|None = None, last_error: str|None = None):
    assert table in ("downloads", "uploads")
    sets, vals = ["updated_at = datetime('now')"], []
    if progress_bp is not None: sets.append("progress_bp = ?"); vals.append(progress_bp)
    if status is not None:      sets.append("status = ?");      vals.append(status)
    if retries is not None:     sets.append("retries = ?");     vals.append(retries)
    if last_error is not None:  sets.append("last_error = ?");  vals.append(last_error)
    vals.append(job_id)
    with tx(conn) as cur:
        cur.execute(f"UPDATE {table} SET {', '.join(sets)} WHERE id = ?", vals)
    _emit_job_update(table, job_id)

def claim_next_job(conn: apsw.Connection, table: str, worker_id: str,
                   lease_seconds: int = 300) -> Optional[Dict[str, Any]]:
    assert table in ("downloads", "uploads")

    max_attempts = 8
    base_sleep = 0.02  # 20 ms
    max_sleep  = 0.5   # 500 ms

    for attempt in range(1, max_attempts + 1):
        try:
            # Garante lock de escrita logo no início (reduz janela de corrida)
            conn.execute("BEGIN IMMEDIATE;")

            # Escolhe e atualiza 1 job de forma atômica
            # - prioriza 'queued'
            # - permite re-claim de 'running' expirado
            # - marca como 'running' + lease + heartbeat/claimed_at
            row = conn.execute(f"""
                WITH next AS (
                  SELECT id
                  FROM {table}
                  WHERE status='queued'
                     OR (status='running' AND lease_until IS NOT NULL AND lease_until < datetime('now'))
                  ORDER BY (status='queued') DESC, priority DESC, ordem ASC, id ASC
                  LIMIT 1
                )
                UPDATE {table}
                SET status         = 'running',
                    worker_id      = ?,
                    claimed_at     = COALESCE(claimed_at, datetime('now')),
                    last_heartbeat = datetime('now'),
                    lease_until    = datetime('now', ?),
                    attempts       = CASE WHEN status='queued' THEN attempts + 1 ELSE attempts END,
                    updated_at     = datetime('now')
                WHERE id IN (SELECT id FROM next)
                RETURNING *;
            """, (worker_id, f'+{lease_seconds} seconds')).fetchone()

            conn.execute("COMMIT;")

            if row is None:
                return None  # não havia job elegível

            # Converte para dict usando nomes de colunas do cursor anterior
            # (APSW retorna um tuple; pegue nomes via cursor description-like)
            # Truque: rode um SELECT de metadados rápido para obter schema
            columns = [d[1] for d in conn.execute(f"PRAGMA table_info({table})")]
            return {col: row[i] for i, col in enumerate(columns)}

        except apsw.BusyError:
            # Lockado: rollback e retry com backoff + jitter
            try:
                conn.execute("ROLLBACK;")
            except Exception:
                pass
            sleep = base_sleep * (2 ** (attempt - 1)) + random.uniform(0, base_sleep)
            time.sleep(min(sleep, max_sleep))
            continue

        except Exception:
            # Qualquer outra falha: garanta rollback e propague
            try:
                conn.execute("ROLLBACK;")
            except Exception:
                pass
            raise

    # Não conseguiu reservar após N tentativas (pico de contenção)
    return None

def fetch_job(conn: apsw.Connection, table: JobTable, job_id: str) -> Optional[Dict[str, Any]]:
    assert table in ("downloads", "uploads")
    cur = conn.cursor()
    cols = _table_cols(conn, table)
    row = cur.execute(f"SELECT {','.join(cols)} FROM {table} WHERE id=?", (job_id,)).fetchone()
    return _row_to_job(cols, row) if row else None

def mark_done(conn: apsw.Connection, table: JobTable, job_id: str):
    job_update_progress(conn, table, job_id, progress_bp=10_000, status="done", last_error=None)

def mark_error(conn: apsw.Connection, table: JobTable, job_id: str, err: str, *, inc_retry=True, max_retries: int|None=None):
    cur = conn.cursor()
    row = cur.execute(f"SELECT retries FROM {table} WHERE id=?", (job_id,)).fetchone()
    retries = int(row[0]) if row else 0
    new_retries = retries + (1 if inc_retry else 0)
    if max_retries is not None and new_retries >= max_retries:
        job_update_progress(conn, table, job_id, status="error", retries=new_retries, last_error=err)
    else:
        job_update_progress(conn, table, job_id, status="queued", retries=new_retries, last_error=err)

def heartbeat(conn: apsw.Connection, table: JobTable, job_id: str, *,
              worker_id: str, bp: Optional[int] = None, lease_seconds: int = 300) -> bool:
    assert table in ("downloads", "uploads")
    sets = [
        "updated_at = datetime('now')",
        "last_heartbeat = datetime('now')",
        "lease_until = datetime('now', ?)",
    ]
    vals = [f'+{lease_seconds} seconds']
    if bp is not None:
        sets.append("progress_bp = ?")
        vals.append(int(bp))
    vals.extend([job_id, worker_id])

    cur = conn.cursor()
    cur.execute(f"""
        UPDATE {table}
           SET {", ".join(sets)}
         WHERE id=? AND status='running' AND worker_id=?;
    """, vals)
    changed = cur.getconnection().changes() == 1
    if changed and bp is not None:
        _emit_job_update(table, job_id)
    return changed

def recover_orphan_jobs(conn: apsw.Connection, table: JobTable, stale_minutes=1) -> int:
    cur = conn.cursor()
    cur.execute(f"""
        UPDATE {table}
           SET status='queued',
               worker_id=NULL,
               lease_until=NULL,
               updated_at=datetime('now')
         WHERE status='running' AND (
               lease_until IS NULL
            OR lease_until < datetime('now')
            OR updated_at < datetime('now', ?)
         );
    """, (f'-{stale_minutes} minutes',))
    n = conn.changes()
    if n:
        socket.emit("jobs_changed", {
            "table": table,
            "change": {"type": "refresh"}
        })
    return n
