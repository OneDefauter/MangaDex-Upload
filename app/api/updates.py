import os
from pathlib import Path
from flask import Blueprint, jsonify, request, current_app
from app.src.utils.check_update import check_update  # opcional
from app.src.utils.updater import updater            # helper do update
from app.src.utils.restart import schedule_self_restart
from app.src.workers import stop_queue_workers
from app.src.logging import logger
from app.src.SocketIO import socket
from app.src.services.language import t, get_effective_lang

updates_api = Blueprint("updates_api", __name__)

GITHUB_LATEST = "https://api.github.com/repos/OneDefauter/MangaDex-Upload/releases/latest"


def get_app_folder() -> str:
    # Ajuste caso queira uma pasta específica (ex.: app.config['APP_FOLDER'])
    base = current_app.config.get("APP_FOLDER", current_app.root_path)
    base_path = Path(base).resolve().parent
    return str(base_path)


@updates_api.route("/api/check-update")
def api_check_update():
    result = check_update()
    # Mantém o contrato atual: retorna apenas o boolean
    return jsonify(result["update_available"])


@updates_api.route("/api/apply-update", methods=["POST"])
def api_apply_update():
    """
    Aplica a atualização baixando o zip da última release e extraindo sobre a app_folder.
    Aceita JSON opcional {"zipUrl": "..."} para forçar uma URL específica.
    """
    lang = get_effective_lang()
    payload = request.get_json(silent=True) or {}
    zip_url = payload.get("zipUrl")

    data = {"update": True}
    if zip_url:
        data["zipUrl"] = zip_url

    try:
        ok = updater(data=data, repo=GITHUB_LATEST, app_folder=get_app_folder())
        logger.debug(f"Updater result: {ok}")
        logger.debug(f"Updater payload: {data}, {get_app_folder()}")

        if ok:
            # para workers e agenda reinício
            stop_queue_workers()
            schedule_self_restart(5.0)

            msg = t(lang, "api.updates.apply.ok", namespace="app", default_value="Update applied")
            logger.info(msg)

            # notificação opcional em tempo real
            try:
                socket.emit("notify", {"message": msg, "type": "success"})
            except Exception:
                pass

            return jsonify({"ok": True, "updated": True}), 200

        err = t(lang, "api.updates.apply.failed", namespace="app", default_value="Failed to apply update")
        return jsonify({"ok": False, "updated": False, "error": err}), 500

    except Exception as e:
        log_msg = t(lang, "api.updates.apply.exception", namespace="app", default_value="apply-update error")
        current_app.logger.exception(log_msg)
        # devolve a mensagem de erro original para facilitar debug no cliente
        return jsonify({"ok": False, "updated": False, "error": str(e)}), 500
