import os

# Diretório e arquivo para armazenar tokens, configurações e logs de upload
settings_dir = os.path.join(os.path.expanduser("~"), "MangaDex Upload Settings")
token_file = os.path.join(settings_dir, "oauth.enc")
config_file = os.path.join(settings_dir, "config.json")
log_upload_file = os.path.join(settings_dir, "upload_log.json")

# FileDialog
file_dialog = os.path.join(os.getcwd(), "src", "core", "Utils", "Others", "Windows", "FileDialog.exe")

# Geração e carregamento de chave de criptografia
key_file = os.path.join(settings_dir, "secret.key")
