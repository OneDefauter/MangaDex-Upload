from __future__ import annotations
from contextlib import contextmanager
import apsw

from app.src.database.helpers.schema import SCHEMA_SQL

def open_db(path: str) -> apsw.Connection:
    conn = apsw.Connection(path)

    # espera por locks até 5s antes de levantar BusyError
    conn.setbusytimeout(5000)  # ms

    # PRAGMAs fora de transação (sem "with conn:")
    # journal_mode=WAL retorna uma linha; consumir não é obrigatório no APSW,
    # mas não faz mal "iterar" para garantir.
    for _ in conn.execute("PRAGMA journal_mode=WAL;"):
        pass
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA temp_store=MEMORY;")
    conn.execute("PRAGMA wal_autocheckpoint=1000;")

    return conn

@contextmanager
def tx(conn: apsw.Connection):
    cur = conn.cursor()
    try:
        cur.execute("BEGIN;")
        yield cur
        cur.execute("COMMIT;")
    except Exception:
        cur.execute("ROLLBACK;")
        raise

def _exec_with_complete(conn: apsw.Connection, script: str) -> None:
    buffer = ""
    with tx(conn) as cur:
        for line in script.splitlines():
            buffer += line + "\n"
            if apsw.complete(buffer.strip()):
                cur.execute(buffer.strip())
                buffer = ""
        if buffer.strip():
            if apsw.complete(buffer.strip()):
                cur.execute(buffer.strip())
            else:
                raise RuntimeError("Schema SQL terminou com statement incompleto.")

def ensure_schema(conn: apsw.Connection) -> None:
    cur = conn.cursor()
    cur.execute("PRAGMA foreign_keys=ON;")
    _exec_with_complete(conn, SCHEMA_SQL)
