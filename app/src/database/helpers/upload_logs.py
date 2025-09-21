from __future__ import annotations
from typing import Any, Dict, List, Optional, Iterable, Tuple
from datetime import datetime
import json
import apsw

from app.src.database.db import tx

LEVELS = {"debug", "info", "warning", "error", "critical"}

def _json(obj) -> str:
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))

def add_upload_log(conn: apsw.Connection,
                   *,
                   upload_id: Optional[str],
                   message: str,
                   level: str = "info",
                   stage: Optional[str] = None,
                   code: Optional[str] = None,
                   data: Any = None,
                   ts: Optional[str] = None) -> int:
    """
    Insere um registro em upload_logs. Retorna rowid.
    """
    level = (level or "info").lower()
    if level not in LEVELS:
        level = "info"

    data_json = None if data is None else _json(data)

    if ts is None:
            # mesmo formato que o SQLite usa em datetime('now')
            ts = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')

    with tx(conn) as cur:
        cur.execute("""
            INSERT INTO upload_logs (upload_id, ts, level, stage, code, message, data)
            VALUES (?,?,?,?,?,?,?)
        """, (upload_id, ts, level, stage, code, message, data_json))
        rowid = cur.getconnection().last_insert_rowid()
    return int(rowid)

def _where_and_params(upload_id: Optional[str],
                      levels: Optional[Iterable[str]],
                      stages: Optional[Iterable[str]],
                      q: Optional[str],
                      since: Optional[str],
                      until: Optional[str]) -> tuple[str, list]:
    where = []
    params: List[Any] = []

    if upload_id:
        where.append("upload_id = ?")
        params.append(upload_id)

    if levels:
        lv = [str(x).lower() for x in levels if str(x).lower() in LEVELS]
        if lv:
            ph = ",".join("?" for _ in lv)
            where.append(f"level IN ({ph})")
            params.extend(lv)

    if stages:
        st = [str(x) for x in stages if x]
        if st:
            ph = ",".join("?" for _ in st)
            where.append(f"stage IN ({ph})")
            params.extend(st)

    if q:
        where.append("message LIKE ?")
        params.append(f"%{q}%")

    if since:
        where.append("ts >= ?")
        params.append(since)

    if until:
        where.append("ts <= ?")
        params.append(until)

    sql_where = f"WHERE {' AND '.join(where)}" if where else ""
    return sql_where, params

def list_upload_logs(conn: apsw.Connection,
                     *,
                     upload_id: Optional[str] = None,
                     levels: Optional[Iterable[str]] = None,
                     stages: Optional[Iterable[str]] = None,
                     q: Optional[str] = None,
                     since: Optional[str] = None,
                     until: Optional[str] = None,
                     limit: int = 100,
                     offset: int = 0,
                     order: str = "ts DESC") -> List[Dict[str, Any]]:
    """
    Lista logs com filtros e paginação.
    """
    where, params = _where_and_params(upload_id, levels, stages, q, since, until)
    limit = max(0, int(limit))
    offset = max(0, int(offset))

    sql = f"""
      SELECT id, upload_id, ts, level, stage, code, message, data, created_at
        FROM upload_logs
        {where}
        ORDER BY {order}
        LIMIT ? OFFSET ?
    """
    params_ext = params + [limit, offset]
    cur = conn.cursor()
    rows = cur.execute(sql, params_ext).fetchall()

    out: List[Dict[str, Any]] = []
    for r in rows:
        d = {
            "id": r[0], "upload_id": r[1], "ts": r[2], "level": r[3],
            "stage": r[4], "code": r[5], "message": r[6],
            "data": None, "created_at": r[8],
        }
        try:
            d["data"] = json.loads(r[7]) if r[7] else None
        except Exception:
            d["data"] = None
        out.append(d)
    return out

def count_upload_logs(conn: apsw.Connection, **kwargs) -> int:
    """
    Conta total com os mesmos filtros usados em list_upload_logs.
    """
    where, params = _where_and_params(
        kwargs.get("upload_id"),
        kwargs.get("levels"),
        kwargs.get("stages"),
        kwargs.get("q"),
        kwargs.get("since"),
        kwargs.get("until"),
    )
    cur = conn.cursor()
    row = cur.execute(f"SELECT COUNT(*) FROM upload_logs {where}", params).fetchone()
    return int(row[0] if row else 0)
