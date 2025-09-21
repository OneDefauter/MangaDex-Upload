import os
import secrets
from typing import Optional

def load_or_create_secret_key(path: str, *, length_bytes: int = 32) -> str:
    """
    Lê a SECRET_KEY de `path`. Se não existir, cria uma nova (hex, 2*length_bytes chars),
    salva com permissão restrita e retorna. Idempotente e seguro contra corrida.
    """
    # Se já existe, tenta ler
    try:
        with open(path, "r", encoding="utf-8") as f:
            key = f.read().strip()
        if key:
            return key
    except FileNotFoundError:
        pass

    # Gera nova chave
    key = secrets.token_hex(length_bytes)

    # Garante diretório
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)

    # Tenta criar de forma exclusiva para evitar corrida entre processos
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    if os.name != "nt":
        # 0o600 → leitura/escrita só para o dono
        fd = os.open(path, flags, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(key + "\n")
    else:
        # No Windows não há chmod 0o600 efetivo; ainda assim cria exclusivo
        # (se quiser, você pode marcar como hidden depois)
        fd = os.open(path, flags)
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(key + "\n")

    return key
