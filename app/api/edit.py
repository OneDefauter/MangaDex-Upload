from __future__ import annotations
from flask import Blueprint, request, jsonify, current_app
import httpx

from app.src.database import conn
from app.src.database.db import get_all_settings
from app.src.auth.mangadex import get_or_refresh_access_token, AuthError
from app.src.utils.mdx_utils import (
    get_api_base, make_user_agent, auth_headers, retryable_get, group_objects
)
from app.src.services.language import t, get_effective_lang

edit_api = Blueprint("edit_api", __name__)

# ───────────────────────── API: listar capítulos do próprio uploader ─────────

@edit_api.get("/api/edit/chapters")
def api_list_my_chapters():
    """
    Query:
      - manga_id (obrigatório)
      - lang (opcional)
      - limit (<=100) | offset
    Retorno:
      { "total": N, "items": [ { id, ch, vol, title, readableAt, groups:[{id,name}], version } ] }
    """
    lang_ui = get_effective_lang()

    manga_id = (request.args.get("manga_id") or "").strip()
    if not manga_id:
        return jsonify({"total": 0, "items": []})

    lang   = (request.args.get("lang") or "").strip()
    limit  = max(1, min(int(request.args.get("limit", 100) or 100), 100))
    offset = max(0, int(request.args.get("offset", 0) or 0))

    settings = get_all_settings(conn) or {}
    api_base = get_api_base(settings)

    try:
        token = get_or_refresh_access_token(conn)
    except AuthError as e:
        return jsonify({"total": 0, "items": [], "error": str(e)}), 401

    try:
        with httpx.Client(timeout=20.0) as cli:
            # 1) Descobrir meu user id
            r_me = retryable_get(cli, f"{api_base}/user/me", headers=auth_headers(token, ua=make_user_agent()))
            me = r_me.json().get("data") or {}
            my_id = me.get("id")
            if not my_id:
                return jsonify({"total": 0, "items": [], "error": t(lang_ui, "api.edit.errors.user_id_unavailable", namespace="app")}), 401

            # 2) Buscar capítulos enviados por mim
            params = [
                ("manga", manga_id),
                ("uploader", my_id),
                ("limit", str(limit)),
                ("offset", str(offset)),
                ("includes[]", "scanlation_group"),
                ("order[readableAt]", "desc"),
                ("contentRating[]", "safe"),
                ("contentRating[]", "suggestive"),
                ("contentRating[]", "erotica"),
                ("contentRating[]", "pornographic"),

            ]
            if lang:
                params.append(("translatedLanguage[]", lang))

            r = retryable_get(cli, f"{api_base}/chapter", params=params, headers=auth_headers(token, ua=make_user_agent()))
            data = r.json()
            items = data.get("data") or []
            total = int(data.get("total") or 0)

            out = []
            for it in items:
                attrs = it.get("attributes") or {}
                rels  = it.get("relationships") or []
                out.append({
                    "id": it.get("id"),
                    "ch": attrs.get("chapter"),
                    "vol": attrs.get("volume"),
                    "title": attrs.get("title"),
                    "readableAt": attrs.get("readableAt"),
                    "groups": group_objects(rels),
                    "version": attrs.get("version"),
                })

            return jsonify({"total": total, "items": out})

    except httpx.HTTPError:
        current_app.logger.exception(t(lang_ui, "api.edit.logs.list_error", namespace="app"))
        return jsonify({"total": 0, "items": [], "error": "network_error"}), 502


# ───────────────────────── API: update capítulo (campos básicos + groups) ────

@edit_api.route("/api/edit/chapter/<chapter_id>", methods=["PUT", "PATCH"])
def api_update_chapter(chapter_id: str):
    """
    Body JSON: { title?, chapter?, volume?, publishAt?, externalUrl?, groups?, version? }
    - Envia PUT /chapter/{id} com Authorization
    - Se 'version' não vier, buscamos antes via GET /chapter/{id}
    """
    lang_ui = get_effective_lang()

    try:
        token = get_or_refresh_access_token(conn)
    except AuthError as e:
        return jsonify({"ok": False, "error": str(e)}), 401

    payload = request.get_json(silent=True) or {}

    allowed_keys = {"title", "chapter", "volume", "publishAt", "externalUrl", "groups"}
    allowed = {k: v for k, v in payload.items() if k in allowed_keys}
    version = payload.get("version")

    # valida groups, se veio
    if "groups" in allowed:
        groups = allowed["groups"] or []
        if not isinstance(groups, list) or not all(isinstance(x, str) for x in groups):
            return jsonify({"ok": False, "error": t(lang_ui, "api.edit.errors.groups_list_uuid", namespace="app")}), 400
        if len(groups) == 0:
            return jsonify({"ok": False, "error": t(lang_ui, "api.edit.errors.groups_required", namespace="app")}), 400
        if len(groups) > 3:
            return jsonify({"ok": False, "error": t(lang_ui, "api.edit.errors.groups_max3", namespace="app")}), 400

    if not allowed and version is None:
        return jsonify({"ok": False, "error": t(lang_ui, "api.edit.errors.no_fields", namespace="app")}), 400

    api_base = get_api_base(get_all_settings(conn))

    try:
        with httpx.Client(timeout=20.0) as cli:
            # buscar versão atual se necessário
            if version is None:
                r_cur = cli.get(f"{api_base}/chapter/{chapter_id}", headers=auth_headers(token, ua=make_user_agent()))
                if r_cur.status_code == 404:
                    return jsonify({"ok": False, "error": t(lang_ui, "api.edit.errors.chapter_not_found", namespace="app")}), 404
                r_cur.raise_for_status()
                j = r_cur.json()
                version = (j.get("data") or {}).get("attributes", {}).get("version")
                if version is None:
                    return jsonify({"ok": False, "error": t(lang_ui, "api.edit.errors.version_unavailable", namespace="app")}), 409

            body = dict(allowed)
            body["version"] = version

            r = cli.put(f"{api_base}/chapter/{chapter_id}", headers=auth_headers(token, ua=make_user_agent()), json=body)
            if r.status_code == 200:
                return jsonify({"ok": True})

            # erros comuns
            if r.status_code == 401:
                return jsonify({"ok": False, "error": t(lang_ui, "api.edit.errors.unauthorized", namespace="app")}), 401
            if r.status_code == 403:
                return jsonify({"ok": False, "error": t(lang_ui, "api.edit.errors.forbidden", namespace="app")}), 403
            if r.status_code == 404:
                return jsonify({"ok": False, "error": t(lang_ui, "api.edit.errors.chapter_not_found", namespace="app")}), 404
            if r.status_code == 409:
                try:
                    err = r.json()
                except Exception:
                    err = None
                return jsonify({"ok": False, "error": t(lang_ui, "api.edit.errors.version_conflict", namespace="app"), "detail": err}), 409

            try:
                err = r.json()
            except Exception:
                err = {"status": r.status_code, "text": r.text}
            return jsonify({"ok": False, "error": t(lang_ui, "api.edit.errors.unexpected", namespace="app"), "detail": err}), 502

    except httpx.HTTPError:
        current_app.logger.exception(t(lang_ui, "api.edit.logs.update_error", namespace="app"))
        return jsonify({"ok": False, "error": "network_error"}), 502


@edit_api.route("/api/edit/chapter/<chapter_id>/groups", methods=["PUT", "PATCH"])
def api_update_chapter_groups(chapter_id: str):
    lang_ui = get_effective_lang()

    try:
        token = get_or_refresh_access_token(conn)
    except AuthError as e:
        return jsonify({"ok": False, "error": str(e)}), 401

    payload = request.get_json(silent=True) or {}
    groups  = payload.get("groups") or []          # lista de UUIDs
    version = payload.get("version")               # opcional

    if not isinstance(groups, list):
        return jsonify({"ok": False, "error": t(lang_ui, "api.edit.errors.groups_invalid", namespace="app")}), 400

    api_base = get_api_base(get_all_settings(conn))
    try:
        with httpx.Client(timeout=20.0) as cli:
            if version is None:
                r_cur = cli.get(f"{api_base}/chapter/{chapter_id}", headers=auth_headers(token, ua=make_user_agent()))
                if r_cur.status_code == 404:
                    return jsonify({"ok": False, "error": t(lang_ui, "api.edit.errors.chapter_not_found", namespace="app")}), 404
                r_cur.raise_for_status()
                version = (r_cur.json().get("data") or {}).get("attributes", {}).get("version")

            body = {"groups": groups, "version": version}
            r = cli.put(f"{api_base}/chapter/{chapter_id}", headers=auth_headers(token, ua=make_user_agent()), json=body)

            if r.status_code == 200:
                return jsonify({"ok": True})

            if r.status_code in (401, 403, 404, 409):
                return jsonify({"ok": False, "status": r.status_code, "detail": r.json()}), r.status_code

            return jsonify({"ok": False, "status": r.status_code, "text": r.text}), 502
    except httpx.HTTPError:
        current_app.logger.exception(t(lang_ui, "api.edit.logs.update_groups_error", namespace="app"))
        return jsonify({"ok": False, "error": "network_error"}), 502


# ───────────────────────── API: delete capítulo ──────────────────────────────

@edit_api.delete("/api/edit/chapter/<chapter_id>")
def api_delete_chapter(chapter_id: str):
    """
    DELETE /api/edit/chapter/<id>?version=#
    - Passa Authorization para MangaDex
    - Se 'version' não vier, busca antes via GET /chapter/{id}
    """
    lang_ui = get_effective_lang()

    try:
        token = get_or_refresh_access_token(conn)
    except AuthError as e:
        return jsonify({"ok": False, "error": str(e)}), 401

    settings = get_all_settings(conn) or {}
    api_base = get_api_base(settings)
    version = request.args.get("version")

    try:
        with httpx.Client(timeout=20.0) as cli:
            if version is None:
                r_cur = cli.get(f"{api_base}/chapter/{chapter_id}", headers=auth_headers(token, ua=make_user_agent()))
                if r_cur.status_code == 404:
                    return jsonify({"ok": False, "error": t(lang_ui, "api.edit.errors.chapter_not_found", namespace="app")}), 404
                r_cur.raise_for_status()
                version = (r_cur.json().get("data") or {}).get("attributes", {}).get("version")
                if version is None:
                    return jsonify({"ok": False, "error": t(lang_ui, "api.edit.errors.version_unavailable", namespace="app")}), 409

            r = cli.delete(
                f"{api_base}/chapter/{chapter_id}",
                headers=auth_headers(token, ua=make_user_agent()),
                params={"version": version}
            )

            if r.status_code in (200, 204):
                return jsonify({"ok": True})

            if r.status_code in (401, 403, 404, 409):
                try:
                    detail = r.json()
                except Exception:
                    detail = {"text": r.text}
                return jsonify({"ok": False, "error": "delete_failed", "detail": detail}), r.status_code

            try:
                detail = r.json()
            except Exception:
                detail = {"text": r.text}
            return jsonify({"ok": False, "error": "unexpected", "detail": detail}), 502

    except httpx.HTTPError:
        current_app.logger.exception(t(lang_ui, "api.edit.logs.delete_error", namespace="app"))
        return jsonify({"ok": False, "error": "network_error"}), 502
