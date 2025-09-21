from __future__ import annotations
from flask import Blueprint, render_template
from app.src.database.db import get_all_settings
from app.src.database import conn

logs_bp = Blueprint("logs_page", __name__)

@logs_bp.get("/logs")
def logs_page():
    settings = get_all_settings(conn)
    return render_template("logs.html", settings=settings)
