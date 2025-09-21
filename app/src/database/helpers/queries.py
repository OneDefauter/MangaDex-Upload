from __future__ import annotations
import apsw
from typing import Any, Dict, Optional, List
from app.src.database.helpers.jobs_core import (
    VALID_STATUSES, _table_cols, _rows_to_dicts
)

from typing import Literal
JobTable = Literal["downloads", "uploads"]

def list_jobs(conn: apsw.Connection, table: JobTable, *,
              statuses: Optional[List[str]] = None,
              limit: int = 100,
              offset: int = 0,
              order_by: Optional[List[str]] = None) -> list[Dict[str, Any]]:
    assert table in ("downloads", "uploads")
    if statuses:
        for st in statuses:
            if st not in VALID_STATUSES:
                raise ValueError(f"status inválido: {st}")

    order_by = order_by or ["priority DESC", "ordem ASC", "id ASC"]
    where = ""
    params: list[Any] = []
    if statuses:
        placeholders = ",".join("?" for _ in statuses)
        where = f"WHERE status IN ({placeholders})"
        params.extend(statuses)

    sql = f"""
        SELECT * FROM {table}
        {where}
        ORDER BY {", ".join(order_by)}
        LIMIT ? OFFSET ?
    """
    params.extend([max(0, int(limit)), max(0, int(offset))])

    cur = conn.cursor()
    cols = _table_cols(conn, table)
    rows = cur.execute(sql, params).fetchall()
    return _rows_to_dicts(cols, rows)

def count_jobs(conn: apsw.Connection, table: JobTable, *,
               statuses: Optional[List[str]] = None) -> int:
    assert table in ("downloads", "uploads")
    cur = conn.cursor()
    if statuses:
        for st in statuses:
            if st not in VALID_STATUSES:
                raise ValueError(f"status inválido: {st}")
        placeholders = ",".join("?" for _ in statuses)
        row = cur.execute(f"SELECT COUNT(*) FROM {table} WHERE status IN ({placeholders})", statuses).fetchone()
    else:
        row = cur.execute(f"SELECT COUNT(*) FROM {table}").fetchone()
    return int(row[0] if row else 0)

def get_queue_snapshot(conn: apsw.Connection, table: JobTable, *, head: int = 20) -> Dict[str, Any]:
    assert table in ("downloads", "uploads")
    counts = {st: count_jobs(conn, table, statuses=[st]) for st in VALID_STATUSES}
    queued  = list_jobs(conn, table, statuses=["queued"],  limit=head, order_by=["priority DESC","ordem ASC","id ASC"])
    running = list_jobs(conn, table, statuses=["running"], limit=head, order_by=["updated_at DESC","id ASC"])
    return {"counts": counts, "queued_head": queued, "running": running}
