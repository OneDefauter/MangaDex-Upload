from flask import Blueprint, request, jsonify, render_template
from app.src.database import conn
from app.src.database.db import get_all_settings, set_setting
from app.src.workers import restart_queue_workers
from app.src.utils.storage_usage import get_prefetch_usage_bytes, get_raw_usage_bytes

settings_bp = Blueprint('settings', __name__)

@settings_bp.route('/settings', methods=['GET'])
def settings():
    all_settings = get_all_settings(conn)
    return render_template(
        'settings.html',
        settings=all_settings,
        prefetch_bytes=get_prefetch_usage_bytes(),
        raw_bytes=get_raw_usage_bytes()
    )

@settings_bp.route('/settings', methods=['POST'])
def settings_save():
    data = request.get_json(silent=True) or {}
    incoming = data.get("changes") or {}

    before = get_all_settings(conn) or {}
    changed_keys = []
    for k, v in incoming.items():
        if before.get(k) != v:
            set_setting(conn, k, v)
            changed_keys.append(k)

    RESTART_KEYS = {"dl.simultaneous", "up.simultaneous", "up.max_retries"}
    needs_restart = any(k in RESTART_KEYS for k in changed_keys)
    restarted = False
    if needs_restart:
        restart_queue_workers()
        restarted = True

    return jsonify({"ok": True, "restarted": restarted, "changed": changed_keys})
