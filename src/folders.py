import os

# Diretório e arquivo para armazenar tokens e configurações
settings_dir = os.path.join(os.path.expanduser("~"), "MangaDex Upload Settings")
token_file = os.path.join(settings_dir, "oauth.enc")
config_file = os.path.join(settings_dir, "config.json")

# Geração e carregamento de chave de criptografia
key_file = os.path.join(settings_dir, "secret.key")
