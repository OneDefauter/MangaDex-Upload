from flask import Blueprint, request, jsonify, current_app, g
import httpx

from app.src.database.db import get_all_settings
from app.src.database import conn

from app.src.services.language import t

mdx = Blueprint("mdx", __name__)

MDX_API_BASE = "https://api.mangadex.org"

# campos válidos na order[...] da MangaDex e seus aliases vindos do settings
FIELD_MAP = {
    "relevance": "relevance",
    "title": "title",
    "year": "year",
    "createdAt": "createdAt",
    "updatedAt": "updatedAt",
    "lastChapter": "latestUploadedChapter",  # ← mapeia
    "followers": "followedCount",            # ← mapeia
    "rating": "rating",
}
ALLOWED_DIR = {"asc", "desc"}


def unique_keep_order(seq):
    seen = set()
    out = []
    for x in seq:
        if x in seen:
            continue
        seen.add(x)
        out.append(x)
    return out


def append_list(params, key, values):
    for v in values:
        if v is None or v == "":
            continue
        params.append((f"{key}[]", str(v)))


@mdx.get("/api/mdx/manga")
def mdx_manga():
    settings = get_all_settings(conn) or {}

    q = (request.args.get("title") or "").strip()
    if len(q) < 3:
        return jsonify({"result": "ok", "data": [], "limit": 0, "offset": 0, "total": 0})

    try:
        limit_req = int(request.args.get("limit", 24))
    except ValueError:
        limit_req = 24
    try:
        offset = int(request.args.get("offset", 0))
    except ValueError:
        offset = 0

    limit = max(1, min(100, limit_req))  # MangaDex máx 100 por chamada
    api_base = settings.get("api.url") or MDX_API_BASE

    params = [
        ("title", q),
        ("limit", str(limit)),
        ("offset", str(offset)),
        ("includes[]", "cover_art"),
    ]

    # -------- Filtros: querystring override OU settings --------
    # Se a query trouxer qualquer valor, usamos a query; senão, usamos o settings.
    q_content = request.args.getlist("contentRating[]")
    q_langs   = request.args.getlist("originalLanguage[]")
    q_demo    = request.args.getlist("publicationDemographic[]")
    q_status  = request.args.getlist("status[]")

    s_content = settings.get("search.filters.content_rating") or []
    s_langs   = settings.get("search.filters.languages") or []
    s_demo    = settings.get("search.filters.demography") or []
    s_status  = settings.get("search.filters.status") or []

    content_vals = unique_keep_order(q_content if q_content else s_content)
    lang_vals    = unique_keep_order(q_langs if q_langs else s_langs)
    demo_vals    = unique_keep_order(q_demo if q_demo else s_demo)
    status_vals  = unique_keep_order(q_status if q_status else s_status)

    append_list(params, "contentRating", content_vals)
    append_list(params, "originalLanguage", lang_vals)
    append_list(params, "publicationDemographic", demo_vals)
    append_list(params, "status", status_vals)

    # -------- Ordenação: suporta formato do settings [{key, enabled, dir}] e override via query --------
    # 1) order vinda na query (leva prioridade, pode vir múltiplos): ?order[title]=asc&order[year]=desc
    any_query_order = False
    for k, v in request.args.items():
        if k.startswith("order[") and k.endswith("]"):
            field = k[6:-1]  # extrai entre colchetes
            direction = (v or "desc").lower()
            mapped = FIELD_MAP.get(field)
            if mapped and direction in ALLOWED_DIR:
                params.append((f"order[{mapped}]", direction))
                any_query_order = True

    # 2) se não veio order na query, usa o settings.search.sort (apenas os enabled)
    if not any_query_order:
        sort_list = settings.get("search.sort") or []
        enabled_items = [s for s in sort_list if isinstance(s, dict) and s.get("enabled")]
        for s in enabled_items:
            key = str(s.get("key") or "").strip()
            direction = str(s.get("dir") or "desc").lower()
            mapped = FIELD_MAP.get(key)
            if mapped and direction in ALLOWED_DIR:
                params.append((f"order[{mapped}]", direction))

        # 3) fallback: se nada válido foi adicionado, garante relevance desc
        if not any(k.startswith("order[") for k, _ in params):
            params.append(("order[relevance]", "desc"))

    # -------- Chamada HTTP --------
    try:
        with httpx.Client(timeout=15.0, headers={"User-Agent": "ArgosSearch/1.0"}) as cli:
            r = cli.get(f"{api_base}/manga", params=params)
            r.raise_for_status()
        data = r.json()
        return jsonify(data)
    except httpx.HTTPError as e:
        current_app.logger.exception(t(getattr(g, "user_language", "en"), 
                                "errors.mangadex", 
                                namespace="app") + " %s", e)
        return jsonify({"error": str(e)}), 502
