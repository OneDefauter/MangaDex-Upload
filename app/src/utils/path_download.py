import os
import platform
import subprocess
from pathlib import Path

def get_downloads_path() -> Path:
    system = platform.system()

    # Detecta Android pelo prefixo usado em apps (Pydroid3, Termux, etc.)
    home = str(Path.home())
    if home.startswith("/data/user/0/"):
        # Em muitos casos, o Downloads fica em /storage/emulated/0/Download
        android_download = Path("/storage/emulated/0/Download")
        if android_download.exists():
            return android_download
        # Fallback para a pasta padrão do aplicativo
        return Path(home) / "Download"

    if system == "Windows":
        return Path.home() / "Downloads"

    elif system == "Linux":
        try:
            downloads = subprocess.check_output(
                ["xdg-user-dir", "DOWNLOAD"], stderr=subprocess.DEVNULL
            ).decode().strip()
            if downloads:
                return Path(downloads)
        except Exception:
            pass
        return Path.home() / "Downloads"

    elif system == "Darwin":  # macOS
        return Path.home() / "Downloads"

    # Fallback genérico
    return Path.home() / "Downloads"
