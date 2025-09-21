from __future__ import annotations
from flask import Blueprint, request, jsonify, current_app
from collections import deque
import os, re

from app.src.database import conn
from app.src.database.db import get_all_settings, list_upload_logs, count_upload_logs, LEVELS
from app.src.services.language import t, get_effective_lang

logs_api = Blueprint("logs_api", __name__, url_prefix="/api")

# ---------- Upload logs (DB) ----------
@logs_api.get("/logs/uploads")
def api_logs_uploads():
    q         = request.args.get("q") or None
    upload_id = request.args.get("upload_id") or None
    levels    = request.args.get("levels") or ""   # "error,warning"
    stages    = request.args.get("stages") or ""   # "upload,publish"
    since     = request.args.get("since") or None  # "YYYY-MM-DD" ou "YYYY-MM-DDTHH:MM"
    until     = request.args.get("until") or None
    limit     = int(request.args.get("limit", 100))
    offset    = int(request.args.get("offset", 0))

    levels_list = [x.strip().lower() for x in levels.split(",") if x.strip()] or None
    stages_list = [x.strip() for x in stages.split(",") if x.strip()] or None

    items = list_upload_logs(
        conn,
        upload_id=upload_id,
        levels=levels_list,
        stages=stages_list,
        q=q,
        since=since,
        until=until,
        limit=limit,
        offset=offset,
        order="ts DESC"
    )
    total = count_upload_logs(
        conn,
        upload_id=upload_id,
        levels=levels_list,
        stages=stages_list,
        q=q,
        since=since,
        until=until,
    )

    resp = jsonify({"items": items, "total": total})
    resp.headers["X-Total-Count"] = str(total)
    return resp

# ---------- App logs (arquivo) ----------
# Lê as últimas N linhas do arquivo de log e aplica filtros simples
LOG_DEFAULT_PATHS = ["logs/app.log", "app.log"]

LOG_RE = re.compile(
    r'^(?P<ts>\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:[.,]\d{3})?)\s*'
    r'(?:\[(?P<lvl>[A-Z]+)\]|(?P<lvl2>[A-Z]+))\s+'
    r'(?P<logger>[^:]+):\s*(?P<msg>.*)$'
)

def _discover_log_path(settings) -> str:
    return (settings.get("log.path")
            or settings.get("app.log_file")
            or next((p for p in LOG_DEFAULT_PATHS if os.path.exists(p)), LOG_DEFAULT_PATHS[0]))

def _tail_lines(path: str, max_lines: int) -> list[str]:
    """
    Retorna as últimas max_lines linhas do arquivo (se existir).
    Implementação simples: lê o arquivo inteiro quando pequeno; para grandes, usa deque.
    """
    if not os.path.exists(path):
        return []
    dq: deque[str] = deque(maxlen=max_lines)
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                dq.append(line.rstrip("\n"))
    except Exception as e:
        lang = get_effective_lang()
        msg = t(lang, "api.logs.read_fail", namespace="app", default_value="Failed to read log file: {path} ({error})")
        current_app.logger.warning("%s", msg.format(path=path, error=str(e)))
        return []
    return list(dq)

def _parse_line(line: str) -> dict:
    """Sempre devolve {ts, level, message} — com fallback brando."""
    s = (line or "").rstrip("\n")
    m = LOG_RE.match(s)
    if not m:
        return {"ts": None, "level": "info", "message": s}
    lvl = (m.group("lvl") or m.group("lvl2") or "").lower()
    if lvl not in LEVELS:
        lvl = "info"
    # mantém como string; se quiser ISO exato, troque espaço por 'T'
    ts = m.group("ts")
    return {"ts": ts, "level": lvl, "message": m.group("msg")}

@logs_api.get("/logs/app")
def api_logs_app():
    limit   = max(0, int(request.args.get("limit", 100)))
    offset  = max(0, int(request.args.get("offset", 0)))
    maxread = max(offset + limit, int(request.args.get("maxread", 5000)))

    settings = get_all_settings(conn) or {}
    log_path = _discover_log_path(settings)

    lines = _tail_lines(log_path, maxread)

    parsed = [_parse_line(ln) for ln in lines]
    parsed.reverse()

    # ----- filtro por níveis -----
    levels_param = (request.args.get("levels") or "").strip()
    lvl_set = {x.strip().lower() for x in levels_param.split(",") if x.strip()}
    lvl_set = {x for x in lvl_set if x in LEVELS}
    if lvl_set:
        parsed = [p for p in parsed if p.get("level") in lvl_set]

    # ----- filtro por texto -----
    q = (request.args.get("q") or "").strip()
    if q:
        qlow = q.lower()
        parsed = [p for p in parsed if qlow in (p.get("message") or "").lower()]

    total = len(parsed)
    page  = parsed[offset: offset + limit]

    return jsonify({"items": page, "total": total, "path": log_path})
