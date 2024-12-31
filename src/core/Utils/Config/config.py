import os
import json

from src.core.Utils.Others.folders import settings_dir, config_file

class ConfigFile():
    def __init__(self) -> None:
        # Valores padrão para a configuração
        self.default_config = {
            "upload": 10,
            "retry": 3,
            "log": False,
            "api_url": "https://api.mangadex.org",
            "auth_url": "https://auth.mangadex.org/realms/mangadex/protocol/openid-connect/token",
            "max_results": 12,
            "download_folder": "",
            "download_folder_scheme": "scheme1",
            "cover_image_quality": "reduced",
            "upload_on_error": False,
            "preprocess_images": False,
            "cutting_tool": 'Pillow',
            "output_file_type": "JPG",
            "output_image_quality": 80,
            "queue_operations": 1,
            "image_operations": 1,
            "tips_seen": {
                "upload_page": False,
                "multi_upload_page": False
            }
        }
        
    # Função para carregar a configuração
    def load_config(self):
        os.makedirs(settings_dir, exist_ok=True)

        if not os.path.exists(config_file):
            with open(config_file, 'w') as f:
                json.dump(self.default_config, f, indent=4)

        with open(config_file, 'r') as f:
            config = json.load(f)

        return config

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

    # Função para alterar o status de uma dica
    def toggle_tip_status(self, tip_name, seen):
        config = self.load_config()
        if "tips_seen" not in config:
            config["tips_seen"] = {}
        config["tips_seen"][tip_name] = seen
        self.save_config(config)