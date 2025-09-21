from app.api.search import search_api
from app.api.edit import edit_api
from app.api.download import download_api
from app.api.queue import queue_api
from app.api.logs import logs_api
from app.api.updates import updates_api

from flask import g
from app.src.logging import logger
from app.src.services.language import t, get_effective_lang

def register_api(app):
    app.register_blueprint(search_api)
    app.register_blueprint(edit_api)
    app.register_blueprint(download_api)
    app.register_blueprint(queue_api)
    app.register_blueprint(logs_api)
    app.register_blueprint(updates_api)

    lang = get_effective_lang()
    logger.info(t(lang, "api.registered", namespace="app", default_value="APIs registradas"))
