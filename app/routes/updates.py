from flask import Blueprint, render_template, Response, current_app, url_for, g
import requests, time
from __version__ import VERSION
from app.src.services.language import t

updates_bp = Blueprint("updates", __name__)

RAW_CHANGELOG_URL = (
    "https://raw.githubusercontent.com/OneDefauter/MangaDex-Upload/"
    "refs/heads/main/src/doc/changelog.md"
)

_CACHE = {"ts": 0.0, "body": ""}
_TTL = 300  # segundos (5 min)

def _get_changelog_md() -> str:
    now = time.time()
    if _CACHE["body"] and (now - _CACHE["ts"] < _TTL):
        return _CACHE["body"]
    r = requests.get(RAW_CHANGELOG_URL, timeout=10)
    r.raise_for_status()
    _CACHE["body"] = r.text
    _CACHE["ts"] = now
    return _CACHE["body"]

@updates_bp.route("/updates")
def updates_page():
    return render_template("updates.html", app_version=VERSION)

@updates_bp.route("/updates.md")
def updates_md():
    try:
        body = _get_changelog_md()
        return Response(
            body,
            200,
            headers={
                "Content-Type": "text/markdown; charset=utf-8",
                "Cache-Control": "public, max-age=300",
            },
        )
    except Exception:
        lang = getattr(g, "user_language", "en")
        fallback = (
            "# Changelog\n\n"
            f"{t(lang, 'errors.changelog_unavailable', namespace='app')}\n"
        )
        return Response(fallback, 200, headers={"Content-Type": "text/markdown; charset=utf-8"})
