from flask import Flask
from app.src.SocketIO import socket

from app.routes import register_routes
from app.sockets import register_sockets
from app.api import register_api
from app.routes.before_request import register_middlewares
from app.routes.context_processor import request_user_session
from app.src.utils.secrets_key import load_or_create_secret_key
from app.src.logging import logger
from app.src.path import SECRET_KEY_PATH
from app.src.utils import restart_bus

def create_app(restart_queue=None):
    app = Flask(__name__)
    app.secret_key = load_or_create_secret_key(SECRET_KEY_PATH)

    if restart_queue is not None:
        app.config["RESTART_QUEUE"] = restart_queue
        restart_bus.set_restart_queue(restart_queue)

    with app.app_context():
        socket.init_app(app, cors_allowed_origins="*", async_mode="threading",
                        ping_timeout=30, ping_interval=20)

        register_routes(app)
        register_api(app)
        register_middlewares(app)
        request_user_session(app)
        register_sockets(socket)

        from app.src.workers import start_queue_workers
        start_queue_workers()

    import app.src.utils.gethostname as ghost
    ghost.get_local_ip()

    from app.src.utils.check_update import local_version
    logger.info(f"App version: {local_version}")

    return app
