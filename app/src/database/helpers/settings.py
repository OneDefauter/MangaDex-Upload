from __future__ import annotations
import apsw, json
from typing import Any, Dict
from app.src.database.helpers.conn import tx
from app.src.path import UserDownload  # usado em DEFAULT_SETTINGS

def _json(obj) -> str:
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))

def set_setting(conn: apsw.Connection, key: str, value, *, scope="app", type_hint="auto"):
    val_json = _json(value)
    with tx(conn) as cur:
        cur.execute("""
            INSERT INTO settings(key, value, type, scope)
            VALUES (?,?,?,?)
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                type  = excluded.type,
                scope = excluded.scope,
                updated_at = datetime('now')
        """, (key, val_json, type_hint, scope))

def get_setting(conn: apsw.Connection, key: str, default=None):
    cur = conn.cursor()
    row = cur.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
    if not row:
        return default
    try:
        return json.loads(row[0])
    except Exception:
        return default

def get_all_settings(conn: apsw.Connection) -> Dict[str, Any]:
    cur = conn.cursor()
    rows = cur.execute("SELECT key, value FROM settings").fetchall()
    out: Dict[str, Any] = {}
    for key, val in rows:
        try:
            out[key] = json.loads(val)
        except Exception:
            out[key] = val
    return out

DEFAULT_SETTINGS = {
    "dl.simultaneous": 1,
    "dm.path": str(UserDownload),
    "dm.path_mode": [
        {"key": "lang",   "enabled": True},
        {"key": "title",  "enabled": True},
        {"key": "volume", "enabled": False},
        {"key": "group",  "enabled": False},
        {"key": "chapter","enabled": True, "fixed": True}
    ],
    "up.simultaneous": 5,
    "up.max_retries": 5,
    "up.accept_errors": False,
    "up.prefetch": False,
    "cv.quality": 1,
    "search.max_results": 50,
    "search.pagination": 8,
    "search.filters.status":        [],
    "search.filters.languages":     [],
    "search.filters.demography":    [],
    "search.filters.content_rating":[],
    "search.sort": [
        {"key":"title",       "enabled": False, "dir":"asc"},
        {"key":"year",        "enabled": False, "dir":"asc"},
        {"key":"createdAt",   "enabled": False, "dir":"asc"},
        {"key":"updatedAt",   "enabled": False, "dir":"asc"},
        {"key":"lastChapter", "enabled": False, "dir":"asc"},
        {"key":"followers",   "enabled": False, "dir":"asc"},
        {"key":"relevance",   "enabled": False, "dir":"asc"}
    ],
    "api.url":  "https://api.mangadex.org",
    "api.auth": "https://auth.mangadex.org/realms/mangadex/protocol/openid-connect/token",
    "api.langdetect_token": "",
    "tools.cut.pillow": True,
    "ext.out": ".jpg",
    "quality.image": 80,
    "sm.image": 1,
    "nav.config.list": [],
}

def _infer_scope(key: str) -> str:
    if key.startswith("dl.") or key.startswith("dm."):
        return "download"
    if key.startswith("up."):
        return "upload"
    if key.startswith("cv."):
        return "ui"
    if key.startswith("search."):
        return "search"
    if key.startswith("api."):
        return "api"
    if key.startswith("tools.") or key in ("ext.out","quality.image","sm.pre_image","sm.image"):
        return "other"
    return "app"

def seed_defaults(conn: apsw.Connection, *, overwrite=False):
    for k, v in DEFAULT_SETTINGS.items():
        if overwrite or get_setting(conn, k, None) is None:
            set_setting(conn, k, v, scope=_infer_scope(k))

def check_settings(conn: apsw.Connection):
    for k in DEFAULT_SETTINGS.keys():
        if get_setting(conn, k, None) is None:
            seed_defaults(conn)
            break
