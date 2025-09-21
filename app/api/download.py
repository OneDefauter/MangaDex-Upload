from __future__ import annotations
from flask import Blueprint, request, jsonify, current_app
from werkzeug.exceptions import BadRequest
import httpx

from app.src.database import conn
from app.src.database.db import get_all_settings, downloads_enqueue_bulk
from app.src.SocketIO import socket
from app.src.utils.mdx_utils import (
    MDX_API_BASE,
    get_api_base,
    make_user_agent,
    retryable_get,
    safe_str,
    group_names_from_relationships,
)
from app.src.services.language import t, get_effective_lang
from natsort import natsorted

download_api = Blueprint("download_api", __name__, url_prefix="/api")


@download_api.post("/download/batch")
def download_batch():
    """
    Body JSON:
      {
        "manga_id": "uuid",
        "language": "pt-br",
        "chapter_ids": ["uuid1","uuid2"],
        "manga_title": "..."
      }
    """
    lang = get_effective_lang()
    payload = request.get_json(silent=True) or {}
    manga_id = payload.get("manga_id")
    language = payload.get("language")
    chapter_ids = payload.get("chapter_ids") or []

    if not manga_id or not isinstance(chapter_ids, list) or not chapter_ids:
        raise BadRequest(t(lang, "api.download.errors.missing_fields", namespace="app"))

    settings = get_all_settings(conn) or {}
    api_base = get_api_base(settings) or MDX_API_BASE
    base_path = settings.get("dm.path") or ""
    default_priority = int(settings.get("dl.priority", 0) or 0)

    chapters_detail = []
    try:
        with httpx.Client(timeout=20.0, headers=make_user_agent("ArgosDownloader", "1.0")) as cli:
            CHUNK = 100
            seen = set()
            dedup_ids = [x for x in chapter_ids if not (x in seen or seen.add(x))]

            for i in range(0, len(dedup_ids), CHUNK):
                chunk = dedup_ids[i:i+CHUNK]
                params = [("ids[]", cid) for cid in chunk]
                params += [("includes[]", "scanlation_group")]
                params += [("limit", min(100, len(chunk)))]
                params += [("order[volume]", "desc"), ("order[chapter]", "desc")]

                r = retryable_get(cli, f"{api_base}/chapter", params=params)
                data = r.json()
                chapters_detail.extend(data.get("data", []))

            returned = {d.get("id") for d in chapters_detail}
            missing = [cid for cid in dedup_ids if cid not in returned]
            if missing:
                current_app.logger.warning(
                    t(lang, "api.download.warn.missing_ids", namespace="app")
                    + f" ({len(missing)}): {missing[:5]}"
                    + ("..." if len(missing) > 5 else "")
                )
    except httpx.HTTPError:
        current_app.logger.exception(t(lang, "api.download.errors.fetch_failed", namespace="app"))
        return jsonify({"ok": False, "error": t(lang, "api.download.errors.fetch_failed", namespace="app")}), 502

    chapters_detail = natsorted(
        chapters_detail,
        key=lambda c: c["attributes"]["chapter"]
    )

    items = []
    for it in chapters_detail:
        chap_id = it.get("id")
        attrs = (it.get("attributes") or {})
        rels = it.get("relationships") or []

        idioma = safe_str(attrs.get("translatedLanguage"))
        titulo = safe_str(attrs.get("title"))
        capitulo = safe_str(attrs.get("chapter"))
        volume = safe_str(attrs.get("volume"))
        grupo = group_names_from_relationships(rels)

        one_shot = bool((attrs.get("chapter") in (None, "", "0")) and (attrs.get("volume") in (None, "")))

        items.append({
            "id": chap_id,
            "idioma": idioma,
            "grupo": grupo,
            "titulo": titulo,
            "capitulo": capitulo,
            "volume": volume,
            "one_shot": one_shot,
        })

    projeto_nome = payload.get("manga_title") or ""
    inserted, skipped = downloads_enqueue_bulk(
        conn,
        items,
        projeto=projeto_nome,
        projeto_id=manga_id,
        base_path=base_path,
        default_priority=default_priority
    )

    try:
        if inserted > 0:
            socket.emit("notify", {
                "message": t(lang, "api.download.notify.added", namespace="app").format(count=inserted),
                "type": "success"
            })
        if skipped:
            socket.emit("notify", {
                "message": t(lang, "api.download.notify.skipped", namespace="app").format(count=skipped),
                "type": "info"
            })
    except Exception:
        pass

    return jsonify({
        "ok": True,
        "queued": inserted,
        "skipped": skipped,
        "received": len(chapter_ids),
        "manga_id": manga_id,
        "language": language
    })
