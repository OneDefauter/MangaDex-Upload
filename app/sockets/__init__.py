from flask import g
from app.src.logging import logger
from app.src.services.language import t, get_effective_lang

def register_sockets(socket):
    @socket.on('connect')
    def handle_connect():
        # logger.info(t(lang, "sockets.client_connected", namespace="app"))
        pass

    @socket.on('disconnect')
    def handle_disconnect():
        # logger.info(t(lang, "sockets.client_disconnected", namespace="app"))
        pass

    import app.sockets.queue
    import app.sockets.storage
    
    lang = get_effective_lang()
    logger.info(t(lang, "sockets.registered", namespace="app", default_value="Sockets registrados"))