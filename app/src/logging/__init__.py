import logging
from logging.handlers import RotatingFileHandler
import os

from flask import g
from app.src.services.language import t, get_effective_lang

# ────────────────────────────────────────────
# Configuração do logger principal com rotação
# ────────────────────────────────────────────
LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)

LOG_FILE = os.path.join(LOG_DIR, "app.log")

# cria o handler com rotação
rotating_handler = RotatingFileHandler(
    LOG_FILE,
    maxBytes=5 * 1024 * 1024,  # 5 MB por arquivo
    backupCount=5,             # mantém até 5 arquivos antigos
    encoding="utf-8"
)

# formato dos logs
formatter = logging.Formatter(
    "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
rotating_handler.setFormatter(formatter)

# logger principal
logger = logging.getLogger("AppLogger")
logger.setLevel(logging.DEBUG)  # nível mínimo a registrar
logger.addHandler(rotating_handler)

# também manda pro console
console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)

console_handler.setLevel(logging.INFO)

logger.addHandler(console_handler)

lang = get_effective_lang()
logger.info(t(lang, "logger.initialized", namespace="app", default_value="Logger inicializado"))