from __future__ import annotations
from flask import Blueprint, render_template, abort, current_app, g
import httpx

from app.src.database import conn
from app.src.database.db import get_all_settings
from app.src.utils.mdx_utils import (
    build_cover_url, pick_title, parse_people, parse_cover_filename,
    tag_names, get_api_base, make_user_agent
)

from app.src.services.language import t

edit_bp = Blueprint("edit", __name__)

@edit_bp.get("/edit")
def edit():
    settings = get_all_settings(conn)
    return render_template("search.html", settings=settings, mode='edit')


@edit_bp.get("/edit/<manga_id>")
def edit_page(manga_id: str):
    settings = get_all_settings(conn) or {}
    api_base = get_api_base(settings)
    cv_quality = int(settings.get("cv.quality", 1) or 1)

    try:
        with httpx.Client(timeout=20.0, headers=make_user_agent()) as cli:
            r = cli.get(
                f"{api_base}/manga/{manga_id}",
                params=[("includes[]", "cover_art"), ("includes[]", "author"), ("includes[]", "artist")],
            )
            r.raise_for_status()
            j = r.json()
            data = j.get("data")
            if not data:
                abort(404)

            attrs = data.get("attributes") or {}
            rels  = data.get("relationships") or []

            info = {
                "id": manga_id,
                "title": pick_title(attrs.get("title"), attrs.get("altTitles")),
                "authors": parse_people(rels, "author"),
                "artists": parse_people(rels, "artist"),
                "cover_url": build_cover_url(manga_id, parse_cover_filename(rels), cv_quality),
                "tags": tag_names(attrs.get("tags")),
                "status": attrs.get("status"),
                "year": attrs.get("year"),
                "demographic": attrs.get("publicationDemographic"),
                "contentRating": attrs.get("contentRating"),
                "available_langs": attrs.get("availableTranslatedLanguages") or [],
            }

        return render_template("edit.html", settings=settings, manga=info)

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
