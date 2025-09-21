from __future__ import annotations
from flask import Blueprint, render_template, current_app, abort, g
import httpx, markdown

from app.src.database.db import get_all_settings
from app.src.database import conn

from app.src.utils.mdx_utils import (
    get_api_base,
    build_cover_url,
    pick_title,
    parse_people,
    parse_cover_filename,
    tag_names,
    make_user_agent,
    group_chapters,
)
from app.src.utils.mdx_api import fetch_all_chapters

from app.src.services.language import t

download_bp = Blueprint("download", __name__)

lang_map = {
    "pt": ["pt-br", "pt"],
    "pt-br": ["pt-br", "pt"],
    "en": ["en"],
    "es": ["es", "es-la"],
}

@download_bp.get("/download")
def download():
    settings = get_all_settings(conn)
    return render_template("search.html", settings=settings, mode="download")

@download_bp.get("/download/<manga_id>")
def manga_page(manga_id: str):
    settings = get_all_settings(conn) or {}
    api_base = get_api_base(settings)
    cv_quality = int(settings.get("cv.quality", 1) or 1)
    langs_filter = settings.get("search.filters.languages") or []
    lang = getattr(g, "user_language", "en")

    try:
        with httpx.Client(timeout=20.0, headers=make_user_agent("ArgosApp", "1.0")) as cli:
            # Manga + cover/author/artist
            r = cli.get(
                f"{api_base}/manga/{manga_id}",
                params=[
                    ("includes[]", "cover_art"),
                    ("includes[]", "author"),
                    ("includes[]", "artist"),
                ],
            )
            r.raise_for_status()
            j = r.json()
            data = j.get("data")
            if not data:
                abort(404)

            attrs = data.get("attributes") or {}
            rels  = data.get("relationships") or []

            title      = pick_title(attrs.get("title"), attrs.get("altTitles"))
            authors    = parse_people(rels, "author")
            artists    = parse_people(rels, "artist")
            cover_file = parse_cover_filename(rels)
            cover_url  = build_cover_url(manga_id, cover_file, cv_quality)
            tags       = tag_names(attrs.get("tags"))

            desc_dict = attrs.get("description") or {}
            
            preferred_keys = lang_map.get(lang, [lang]) + ["en"]
            
            raw_description = ""
            for key in preferred_keys:
                if desc_dict.get(key):
                    raw_description = desc_dict[key]
                    break

            if not raw_description and desc_dict:
                raw_description = next(iter(desc_dict.values()), "")

            description_html = markdown.markdown(raw_description)

            manga_info = {
                "id": manga_id,
                "title": title,
                "authors": authors,
                "artists": artists,
                "cover_url": cover_url,
                "tags": tags,
                "status": attrs.get("status"),
                "year": attrs.get("year"),
                "demographic": attrs.get("publicationDemographic"),
                "contentRating": attrs.get("contentRating"),
                "description": description_html,
                "links": attrs.get("links") or {},
            }

            # Chapters (paginado)
            chapters = fetch_all_chapters(cli, api_base, manga_id, langs_filter=langs_filter)

        grouped = group_chapters(chapters)

        return render_template(
            "download.html",
            settings=settings,
            manga=manga_info,
            chapters_by_lang=grouped,
        )

    except httpx.HTTPStatusError as e:
        current_app.logger.exception(t(getattr(g, "user_language", "en"), 
                                       "errors.mangadex", 
                                       namespace="app") + " %s", e)
        abort(e.response.status_code if e.response else 502)
    except httpx.HTTPError as e:
        current_app.logger.exception(t(getattr(g, "user_language", "en"), 
                                       "errors.network", 
                                       namespace="app") + " %s", e)
        abort(502)
