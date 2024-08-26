import os
import requests
try:
    from Crypto.Cipher import AES
    from Crypto.Random import get_random_bytes
    from Crypto.Protocol.KDF import PBKDF2
    from Crypto.Util.Padding import pad, unpad
except ImportError:
    from Cryptodome.Cipher import AES
    from Cryptodome.Random import get_random_bytes
    from Cryptodome.Protocol.KDF import PBKDF2
    from Cryptodome.Util.Padding import pad, unpad
import base64

from src.core.Utils.Others.folders import settings_dir, token_file, key_file

class LoginAuth():
    def __init__(self) -> None:
        self.key = self.load_key()
    
    def load_key(self):
        if os.path.exists(key_file):
            with open(key_file, 'rb') as f:
                return f.read()
        else:
            # Use PBKDF2 to generate a strong key
            password = get_random_bytes(16)
            salt = get_random_bytes(16)
            key = PBKDF2(password, salt, dkLen=32)
            if not os.path.exists(settings_dir):
                os.makedirs(settings_dir)
            with open(key_file, 'wb') as f:
                f.write(key)
            return key

    def encrypt(self, plaintext):
        cipher = AES.new(self.key, AES.MODE_CBC)
        ct_bytes = cipher.encrypt(pad(plaintext.encode('utf-8'), AES.block_size))
        iv = base64.b64encode(cipher.iv).decode('utf-8')
        ct = base64.b64encode(ct_bytes).decode('utf-8')
        return f"{iv}:{ct}"

    def decrypt(self, ciphertext):
        iv, ct = ciphertext.split(':')
        cipher = AES.new(self.key, AES.MODE_CBC, iv=base64.b64decode(iv))
        pt = unpad(cipher.decrypt(base64.b64decode(ct)), AES.block_size)
        return pt.decode('utf-8')

    # Função para carregar dados do arquivo criptografado
    def load_data(self):
        if os.path.exists(token_file):
            with open(token_file, 'rb') as f:
                encrypted_data = f.read().decode('utf-8')
                decrypted_data = self.decrypt(encrypted_data)
                return eval(decrypted_data)
        return None

    # Função para salvar dados no arquivo criptografado
    def save_data(self, data):
        encrypted_data = self.encrypt(str(data))
        with open(token_file, 'wb') as f:
            f.write(encrypted_data.encode('utf-8'))

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
