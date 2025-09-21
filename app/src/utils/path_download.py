import os
import platform
import subprocess
from pathlib import Path

def get_downloads_path() -> Path:
    system = platform.system()

    if system == "Windows":
        # Normalmente: C:\Users\<user>\Downloads
        return Path.home() / "Downloads"

    elif system == "Linux":
        try:
            # Usa o xdg-user-dir (respeita idioma/localização)
            downloads = subprocess.check_output(
                ["xdg-user-dir", "DOWNLOAD"], stderr=subprocess.DEVNULL
            ).decode().strip()
            if downloads:
                return Path(downloads)
        except Exception:
            pass
        # Fallback padrão: /home/<user>/Downloads
        return Path.home() / "Downloads"

    elif system == "Darwin":  # macOS
        return Path.home() / "Downloads"

    else:
        # Caso não detecte o sistema, usa fallback genérico
        return Path.home() / "Downloads"
