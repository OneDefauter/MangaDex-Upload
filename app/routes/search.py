from flask import Blueprint, redirect, request
from app.src.database.db import get_all_settings
from app.src.database import conn

search_bp = Blueprint("search", __name__)

@search_bp.get("/search")
def search():
    mode = request.args.get("mode", "download")  # valor padrão = download
    return redirect('/download' if mode == 'download' else '/edit')
