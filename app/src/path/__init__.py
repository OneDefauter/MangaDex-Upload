import os
from pathlib import Path

from app.src.utils.path_download import get_downloads_path


# .../app
MAIN_PATH = os.path.dirname(os.path.abspath(__file__))  # .../app/src/path
SRC_PATH = os.path.dirname(MAIN_PATH)                   # .../app/src

# User
USER_PATH = os.path.join(os.path.expanduser("~"), "MangaDex Upload Settings")

# User / lang
LANG_FILE = Path(USER_PATH, "lang.txt")

# DB
DB_PATH = os.path.join(USER_PATH, "app.db")

# Secret key
SECRET_KEY_PATH = os.path.join(USER_PATH, "secret.txt")

UserDownload = get_downloads_path()
UserDownload = os.path.join(UserDownload, "MangaDex Downloads")

# Garante diretório
os.makedirs(USER_PATH, exist_ok=True)
os.makedirs(UserDownload, exist_ok=True)