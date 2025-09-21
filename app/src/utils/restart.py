import time, threading
from app.src.logging import logger
from app.src.utils.restart_bus import get_restart_queue
from app.src.services.language import t, get_effective_lang

def schedule_self_restart(delay: float = 5.0):
    """
    Agenda um auto-restart do aplicativo após um atraso especificado (em segundos).
    """
    lang = get_effective_lang()
    q = get_restart_queue()
    if not q:
        logger.error(
            t(
                lang,
                "utils.restart.queue_unavailable",
                namespace="app",
                default_value="Restart queue not available (get_restart_queue() returned None)"
            )
        )
        return

    def _go():
        time.sleep(delay)
        try:
            q.put("restart")
        except Exception as e:
            logger.exception(
                t(
                    lang,
                    "utils.restart.enqueue_failed",
                    namespace="app",
                    default_value="Failed to send 'restart' to the queue: %s"
                ),
                e
            )

    threading.Thread(target=_go, daemon=True).start()
