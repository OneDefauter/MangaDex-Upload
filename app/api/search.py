from __future__ import annotations

import re
import requests
from flask import Blueprint, request, jsonify
from typing import Any, Dict, List, Optional

from app.src.database import conn
from app.src.database.db import get_setting

search_api = Blueprint("api_search", __name__, url_prefix="/api/search")

REQ_TIMEOUT = (10, 20)  # connect, read

UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.I,
)


def _api_base() -> str:
    base = (get_setting(conn, "api.url", "https://api.mangadex.org") or "").rstrip("/")
    return base or "https://api.mangadex.org"


def _md_get(path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    url = f"{_api_base()}{path}"
    r = requests.get(url, params=params or {}, timeout=REQ_TIMEOUT)
    r.raise_for_status()
    return r.json()


def _pick_title(attr_title: Dict[str, str], alt_titles: List[Dict[str, str]]) -> str:
    # preferência de idiomas para exibir um título “bonito”
    for lang in ("pt-br", "en", "ja-ro", "ja"):
        if attr_title.get(lang):
            return attr_title[lang]
    # tenta altTitles
    for cand in alt_titles or []:
        for v in cand.values():
            if v:
                return v
    # por fim, qualquer key do title
    return next(iter(attr_title.values()), "")


def _cover_url(manga_id: str, relationships: List[Dict[str, Any]]) -> Optional[str]:
    for rel in relationships or []:
        if rel.get("type") == "cover_art":
            fn = rel.get("attributes", {}).get("fileName")
            if fn:
                return f"https://uploads.mangadex.org/covers/{manga_id}/{fn}.256.jpg"
    return None


def _normalize_manga(node: Dict[str, Any]) -> Dict[str, Any]:
    mid = node.get("id")
    attr = node.get("attributes") or {}
    title = _pick_title(attr.get("title") or {}, attr.get("altTitles") or [])
    cover = _cover_url(mid, node.get("relationships") or [])
    tags = node['attributes']['tags'] or []
    return {
        "id": mid,
        "title": title or mid,
        "year": attr.get("year"),
        "status": attr.get("status"),
        "demographic": attr.get("publicationDemographic"),
        "contentRating": attr.get("contentRating"),
        "cover": cover,
        "tags": tags,
    }


def _normalize_group(node: Dict[str, Any]) -> Dict[str, Any]:
    gid = node.get("id")
    attr = node.get("attributes") or {}
    return {
        "id": gid,
        "name": attr.get("name") or gid,
        "leader": (attr.get("leader") or {}).get("id"),
        "website": attr.get("website"),
        "discord": attr.get("discord"),
        "ircServer": attr.get("ircServer"),
        "ircChannel": attr.get("ircChannel"),
    }


@search_api.route("/projects")
def search_projects():
    """
    GET /api/search/projects?q=foo&limit=10
    - Se q for UUID: retorna o manga exato (ou vazio se não existir)
    - Senão: pesquisa por título (order[relevance]=desc)
    Retorno: array de objetos normalizados
    """
    q = (request.args.get("q") or "").strip()
    limit = max(1, min(int(request.args.get("limit", 10) or 10), 25))

    if not q:
        return jsonify([])

    try:
        if UUID_RE.match(q):
            data = _md_get(f"/manga/{q}", params={"includes[]": ["cover_art"]})
            # quando é /manga/{id}, o retorno vem em "data" (objeto), não lista
            node = data.get("data")
            return jsonify([_normalize_manga(node)]) if node else jsonify([])
        else:
            # busca por título; inclui cover_art para montar thumbnail
            params = {
                "title": q,
                "limit": limit,
                "includes[]": ["cover_art"],
                "order[relevance]": "desc",
                "contentRating[]": ["safe", "suggestive", "erotica", "pornographic"],
            }
            data = _md_get("/manga", params=params)
            items = data.get("data") or []
            return jsonify([_normalize_manga(x) for x in items])
    except requests.HTTPError as e:
        # loge no seu logger se quiser; manter retorno vazio simplifica o frontend
        return jsonify([]), 200
    except Exception:
        return jsonify([]), 200


@search_api.route("/groups")
def search_groups():
    """
    GET /api/search/groups?q=foo&limit=10
    - Se q for UUID: retorna o grupo exato
    - Senão: pesquisa por nome
    Retorno: array de objetos normalizados
    """
    q = (request.args.get("q") or "").strip()
    limit = max(1, min(int(request.args.get("limit", 10) or 10), 25))

    if not q:
        return jsonify([])

    try:
        if UUID_RE.match(q):
            data = _md_get(f"/group/{q}")
            node = data.get("data")
            return jsonify([_normalize_group(node)]) if node else jsonify([])
        else:
            params = {
                "name": q,
                "limit": limit,
                "order[name]": "asc",
            }
            data = _md_get("/group", params=params)
            items = data.get("data") or []
            return jsonify([_normalize_group(x) for x in items])
    except requests.HTTPError:
        return jsonify([]), 200
    except Exception:
        return jsonify([]), 200
