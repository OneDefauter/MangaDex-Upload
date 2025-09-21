from app.routes.login import login_bp
from app.routes.main import main_bp
from app.routes.settings import settings_bp
from app.routes.queue import queue_bp
from app.routes.search import search_bp
from app.routes.mdx import mdx
from app.routes.download import download_bp
from app.routes.upload import upload_bp
from app.routes.upload_complex import upload_complex_bp
from app.routes.edit import edit_bp
from app.routes.logs import logs_bp
from app.routes.favicon import favicon_bp
from app.routes.updates import updates_bp

from flask import g
from app.src.services.language import t, get_effective_lang
from app.src.logging import logger

def register_routes(app):
    app.register_blueprint(login_bp)
    app.register_blueprint(main_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(queue_bp)
    app.register_blueprint(search_bp)
    app.register_blueprint(mdx)
    app.register_blueprint(download_bp)
    app.register_blueprint(upload_bp)
    app.register_blueprint(upload_complex_bp)
    app.register_blueprint(edit_bp)
    app.register_blueprint(logs_bp)
    app.register_blueprint(favicon_bp)
    app.register_blueprint(updates_bp)

    lang = get_effective_lang()
    logger.info(t(lang, "routes.registered", namespace="app", default_value="Rotas registradas"))
