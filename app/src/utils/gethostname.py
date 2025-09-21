import socket
from app.src.logging import logger
from app.src.services.language import t, get_effective_lang

def get_local_ip():
    fallback_ip = "127.0.0.1"
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        try:
            # Não precisa ser acessível, é só para obter o IP da interface usada
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
        except OSError as exc:
            lang = get_effective_lang()
            warning_msg = t(
                lang,
                "hostname.fallback_warning",
                namespace="app",
                default_value="Unable to determine local IP, using fallback {ip} ({error})"
            )
            logger.warning(warning_msg.format(ip=fallback_ip, error=exc))
            return fallback_ip
    finally:
        s.close()

local_ip = get_local_ip()

lang = get_effective_lang()

msg_template = t(
    lang,
    "hostname.access_address",
    namespace="app",
    default_value="Endereço de acesso: http://127.0.0.1:5008 ou http://{ip}:5008"
)
logger.info(msg_template.format(ip=local_ip))