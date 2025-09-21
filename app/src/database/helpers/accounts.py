from __future__ import annotations
import apsw
from app.src.database.helpers.conn import tx

def upsert_single_account(conn: apsw.Connection, username, password,
                          client_id, client_secret,
                          access_token=None, refresh_token=None, expires_at=None):
    with tx(conn) as cur:
        cur.execute("""
            INSERT INTO account (id, username, password, client_id, client_secret,
                                 access_token, refresh_token, expires_at)
            VALUES (1,?,?,?,?,?,?,?)
            ON CONFLICT(id) DO UPDATE SET
              username      = excluded.username,
              password      = excluded.password,
              client_id     = excluded.client_id,
              client_secret = excluded.client_secret,
              access_token  = excluded.access_token,
              refresh_token = excluded.refresh_token,
              expires_at    = excluded.expires_at,
              updated_at    = datetime('now')
        """, (username, password, client_id, client_secret,
              access_token, refresh_token, expires_at))

def get_single_account(conn: apsw.Connection):
    cur = conn.cursor()
    row = cur.execute("""
        SELECT username, password, client_id, client_secret,
               access_token, refresh_token, expires_at, updated_at
        FROM account WHERE id=1
    """).fetchone()
    if not row:
        return None
    return {
        "username": row[0],
        "password": row[1],
        "client_id": row[2],
        "client_secret": row[3],
        "access_token": row[4],
        "refresh_token": row[5],
        "expires_at": row[6],
        "updated_at": row[7],
    }
