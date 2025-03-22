import os
import copy
import json
import threading
from json.decoder import JSONDecodeError

from src.core.Utils.Others.folders import settings_dir, config_file

class ConfigFile():
    def __init__(self) -> None:
        self.path_download = ""
        self.lock = threading.Lock()

    # Função para definir a pasta de downloads
    def set_path_download(self, path):
        with self.lock:
            self.path_download = str(path)
            self.set_default()

    def set_default(self):
        # Valores padrão para a configuração
        self.default_config = {
            "version": 1,
            "upload": 5,
            "retry": 3,
            "log": False,
            "api_url": "https://api.mangadex.org",
            "auth_url": "https://auth.mangadex.org/realms/mangadex/protocol/openid-connect/token",
            "max_results": 50,
            "max_results_page": 8,
            "download_folder": self.path_download,
            "download_folder_scheme": "scheme1",
            "cover_image_quality": "reduced",
            "upload_on_error": False,
            "preprocess_images": False,
            "auto_adapt_cutting_tool": False,
            "cutting_tool": 'Pillow',
            "output_file_type": "JPG",
            "output_image_quality": 85,
            "queue_operations": 1,
            "image_operations": 1,
            "loading_animation": "spinner",
            "API_KEY_DETECTLANGUAGE": "",
            "tips_seen": {
                "upload_page": False,
                "multi_upload_page_1": False,
                "multi_upload_page_2": False,
                "create_work_page": False,
            },
            "search_filter": {
                "status": [],
                "availableTranslatedLanguage": [],
                "publicationDemographic": [],
                "contentRating": [],
                "order": {
                    "title": {"enable": False, "type": "asc"},
                    "year": {"enable": False, "type": "asc"},
                    "createdAt": {"enable": False, "type": "asc"},
                    "updatedAt": {"enable": False, "type": "asc"},
                    "latestUploadedChapter": {"enable": False, "type": "asc"},
                    "followedCount": {"enable": False, "type": "asc"},
                    "relevance": {"enable": False, "type": "asc"}
                }
            }
        }

    # Função para carregar a configuração
    def load_config(self, lock=True):
        def cf():
            try:
                os.makedirs(settings_dir, exist_ok=True)

                # Cria o arquivo de configuração se ele não existir
                if not os.path.exists(config_file):
                    with open(config_file, 'w') as f:
                        json.dump(self.default_config, f, indent=4)
                    return self.default_config

                # Carrega o arquivo de configuração
                with open(config_file, 'r') as f:
                    config = json.load(f)

                # Faz uma cópia para verificar se haverá alterações
                original_config = copy.deepcopy(config)

                # Verifica e adiciona os campos ausentes
                self._ensure_defaults(config, self.default_config)

                # Se houver alterações, salva a configuração atualizada
                if config != original_config:
                    self.save_config(config, False)

                return config

            except (json.JSONDecodeError, StopIteration) as e:
                print(f"Erro ao carregar o arquivo JSON de configurações: {e}. Resetando para o padrão.")
                print(config_file)
                with open(config_file, 'w') as f:
                    json.dump(self.default_config, f, indent=4)
                return self.default_config
        if lock:
            with self.lock:
                return cf()
        else:
            return cf()

    # Função para salvar a configuração
    def save_config(self, config, lock=True):
        if lock:
            with self.lock:
                with open(config_file, 'w') as f:
                    json.dump(config, f, indent=4)
        else:
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

    def _ensure_defaults(self, current, defaults):
        """
        Verifica e adiciona campos ausentes em `current` com base nos valores em `defaults`.
        Essa função é recursiva para lidar com objetos aninhados.
        """
        for key, value in defaults.items():
            if key not in current:
                current[key] = value
            elif isinstance(value, dict):  # Se o valor for um dicionário, verifica recursivamente
                self._ensure_defaults(current[key], value)