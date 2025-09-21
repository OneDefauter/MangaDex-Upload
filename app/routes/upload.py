from flask import Blueprint, render_template, request, jsonify, g
from app.src.services.upload_preparer import UploadPreparer
from app.src.database.db import get_all_settings, uploads_enqueue_one
from app.src.database import conn
from app.src.services.language import t
from app.src.utils.schedule_at import normalize_schedule_at
import json

upload_bp = Blueprint('upload', __name__)

@upload_bp.route('/upload')
def upload():
    return render_template('upload.html')

@upload_bp.route("/upload/enqueue", methods=["POST"])
def enqueue():
    lang = getattr(g, "user_language", "en")  # ⬅ idioma atual
    settings = get_all_settings(conn)  # dict

    project_name = request.form.get("project") or None

    groups_json  = request.form.get("groups_full")
    try:
        groups_full  = json.loads(groups_json) if groups_json else []
    except ValueError:
        groups_full = []
    # (seu backend pode aceitar apenas IDs; ajuste aqui se quiser extrair ids)
    # groups_ids = [g["id"] for g in groups_full if isinstance(g, dict) and g.get("id")]

    project_id      = request.form.get("project_id")
    lang_code       = request.form.get("lang")
    title           = request.form.get("title") or None
    oneshot         = (request.form.get("oneshot", "false").lower() == "true")
    long_strip      = (request.form.get("long_strip", "false").lower() == "true")
    chapter         = None if oneshot else (request.form.get("chapter") or None)
    volume          = None if oneshot else (request.form.get("volume") or None)
    schedule_at_raw = request.form.get("schedule_at") or None
    path            = (request.form.get("path") or "").strip()

    # validações mínimas (i18n)
    if not project_id:
        return jsonify({"ok": False, "error": t(lang, "upload.errors.project_required", namespace="app")}), 400
    if not lang_code:
        return jsonify({"ok": False, "error": t(lang, "upload.errors.lang_required", namespace="app")}), 400
    if not oneshot and not chapter:
        return jsonify({"ok": False, "error": t(lang, "upload.errors.chapter_required", namespace="app")}), 400

    schedule_at_iso, schedule_meta = normalize_schedule_at(schedule_at_raw, lang)

    if schedule_at_raw and schedule_meta["reason"] == "invalid_format":
        return jsonify({
            "ok": False,
            "error": t(lang, "upload.errors.invalid_date_format", namespace="app")
        }), 400

    use_prefetch = bool(settings.get("up.prefetch", False))
    tool = "pillow" if settings.get("tools.cut.pillow", True) else "smartstitch"
    output_type = settings.get("ext.out", ".jpg")
    quality = int(settings.get("quality.image", 85))

    preparer = UploadPreparer(
        files=request.files.getlist("files[]"),
        path=path or None,
        use_prefetch=use_prefetch,
        long_strip=long_strip,
        tool=tool,
        output_type=output_type,
        quality=quality
    )
    result = preparer.prepare()
    if not result.ok:
        return jsonify({
            "ok": False,
            "error": t(lang, "upload.errors.prepare_failed", namespace="app").format(error=result.error or "")
        }), 400

    upload_id = uploads_enqueue_one(
        conn,
        projeto=project_name,                 # nome do projeto (se fornecido)
        projeto_id=project_id,
        idioma=lang_code,
        grupos=groups_full,                   # você já está enviando objetos detalhados; mantenha se o DB aceitar
        titulo=title,
        capitulo=chapter,
        volume=volume,
        one_shot=oneshot,
        long_strip=long_strip,
        path=result.path,
        path_temp=(result.path_temp if use_prefetch else None),
        schedule_at=schedule_at_iso,
        priority=0,
        files_count=result.files_count,
    )

    debug = {
        "files_count": result.files_count,
        "total_mb": round(result.total_bytes / (1024*1024), 2),
        "over_200mb": result.over_size_limit,
        "tall_images": result.tall_images[:5],
        "path": result.path,
        "path_temp": result.path_temp,
        "prefetch": use_prefetch,
        "tool": tool,
        "schedule": schedule_meta,
        "schedule_at_utc": schedule_at_iso
    }

    # Erro específico (i18n)
    if result.tall_images and (result.path_temp if use_prefetch else None):
        return jsonify({
            "ok": False,
            "error": t(lang, "upload.errors.too_tall_use_pillow", namespace="app"),
            "debug": debug
        }), 400

    return jsonify({"ok": True, "id": upload_id, "debug": debug})
