import os
import json
from src.folders import settings_dir, config_file

class ConfigFile():
    def __init__(self) -> None:
        # Valores padrão para a configuração
        self.default_config = {
            "upload": 10,
            "retry": 3,
            "log": False,
            "api_url": "https://api.mangadex.org",
            "auth_url": "https://auth.mangadex.org/realms/mangadex/protocol/openid-connect/token",
            "max_results": 10,
            "download_folder": "",
            "tips_seen": {
                "upload_page": False
            }
        }
        
    # Função para carregar a configuração
    def load_config(self):
        os.makedirs(settings_dir, exist_ok=True)

        if not os.path.exists(config_file):
            with open(config_file, 'w') as f:
                json.dump(self.default_config, f, indent=4)

        with open(config_file, 'r') as f:
            return json.load(f)

    # Função para salvar a configuração
    def save_config(self, config):
        with open(config_file, 'w') as f:
            json.dump(config, f, indent=4)

    # Função para verificar se a dica já foi vista
    def is_tip_seen(self, tip_name):
        config = self.load_config()
        return config.get("tips_seen", {}).get(tip_name, False)

    # Função para marcar a dica como vista
    def mark_tip_as_seen(self, tip_name):
        config = self.load_config()
        config["tips_seen"][tip_name] = True
        self.save_config(config)
