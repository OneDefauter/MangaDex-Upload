import os
import requests

from src.folders import settings_dir, token_file, key_file
from cryptography.fernet import Fernet

class LoginAuth():
    def __init__(self) -> None:
        self.fernet = Fernet(self.load_key())
    
    def load_key(self):
        if os.path.exists(key_file):
            with open(key_file, 'rb') as f:
                return f.read()
        else:
            key = Fernet.generate_key()
            if not os.path.exists(settings_dir):
                os.makedirs(settings_dir)
            with open(key_file, 'wb') as f:
                f.write(key)
            return key

    # Função para carregar dados do arquivo criptografado
    def load_data(self):
        if os.path.exists(token_file):
            with open(token_file, 'rb') as f:
                encrypted_data = f.read()
                decrypted_data = self.fernet.decrypt(encrypted_data).decode('utf-8')
                return eval(decrypted_data)
        return None

    # Função para salvar dados no arquivo criptografado
    def save_data(self, data):
        encrypted_data = self.fernet.encrypt(str(data).encode('utf-8'))
        with open(token_file, 'wb') as f:
            f.write(encrypted_data)

    # Função para atualizar o access_token usando o refresh_token
    def refresh_access_token(self, refresh_token, client_id, client_secret):
        creds = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": client_id,
            "client_secret": client_secret
        }
        r = requests.post(
            "https://auth.mangadex.org/realms/mangadex/protocol/openid-connect/token",
            data=creds
        )
        if r.status_code == 200:
            return r.json().get("access_token")
        return r.status_code
