import os
from pathlib import Path

# Diretório e arquivo para armazenar tokens, configurações e logs de upload
settings_dir = os.path.join(os.path.expanduser("~"), "MangaDex Upload Settings")
token_file = os.path.join(settings_dir, "oauth.enc")
config_file = os.path.join(settings_dir, "config.json")
log_upload_folder = os.path.join(settings_dir, "upload_log")
queues = os.path.join(settings_dir, "queues")
queues_uploads = os.path.join(queues, "uploads")
queues_downloads = os.path.join(queues, "downloads")
queues_db = os.path.join(settings_dir, "queues.db")
path_download = os.path.join(os.path.expanduser("~"), "Downloads", "Mangadex Upload (downloads)")

# FileDialog
file_dialog = os.path.join(os.getcwd(), "src", "core", "Utils", "Others", "Windows", "FileDialog.exe")

# Geração e carregamento de chave de criptografia
key_file = os.path.join(settings_dir, "secret.key")

# Android
android_path = Path('/storage/emulated/0/Download/Mangadex Upload (uploads)')
android_path_download = Path('/storage/emulated/0/Download/Mangadex Upload (downloads)')