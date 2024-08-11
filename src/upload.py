import os
import shutil
import natsort
import requests
from PIL import Image
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor, as_completed

class UploadChapters():
    def __init__(self, manga_id, manga_title, title, language, groups, volume, chapter, path, datetime, oneshot, config, login) -> None:
        self.manga_id = manga_id
        self.manga_title = manga_title
        self.title = title
        self.language = language
        self.groups = groups
        self.volume = volume
        self.chapter = chapter
        self.path = path
        self.datetime = datetime
        self.oneshot = oneshot
        self.config = config
        self.login = login
        
        self.api_url = self.config.default_config['api_url']
    
    def get_upload_session(self):
        r = requests.get(
            f"{self.api_url}/upload",
             headers={
                "Authorization": f"Bearer {self.access_token}"
            }
        )
        
        if r.ok:
            session_id = r.json()["data"]["id"]
            return session_id
            
        elif r.status_code == (401, 403, 404):
            print("Não autorizado") if r.status_code == 401 else None
            print("Token expirado") if r.status_code == 403 else None
            print("Token não encontrado") if r.status_code == 404 else None
            return None
    
    def delete_upload_session(self, session_id):
        r = requests.delete(
            f"{self.api_url}/upload/{session_id}",
            headers={
                "Authorization": f"Bearer {self.access_token}"
            },
        )
    
    def create_upload_session(self):
        r = requests.post(
            f"{self.api_url}/upload/begin",
            headers={
                "Authorization": f"Bearer {self.access_token}"
            },
            json={"groups": [grupo['id'] for grupo in self.groups], "manga": self.manga_id},
        )
        
        if r.ok:
            session_id = r.json()["data"]["id"]
            return session_id
        
        elif r.status_code == (401, 403, 404):
            print("Não autorizado") if r.status_code == 401 else None
            print("Token expirado") if r.status_code == 403 else None
            print("Token não encontrado") if r.status_code == 404 else None
            return None
    
    def get_access_token(self):
        data = self.login.load_data()
        if data:
            access_token = self.login.refresh_access_token(
                data['refresh_token'], data['client_id'], data['client_secret']
            )
            if access_token != (401, 403, 404):
                data['access_token'] = access_token
                self.login.save_data(data)
                
                return access_token
            
            else:
                print("Não autorizado") if access_token == 401 else None
                print("Token expirado") if access_token == 403 else None
                print("Token não encontrado") if access_token == 404 else None
                return None
    
    def process_images(self, session_id):
        valid_image_extensions = ["jpg", "jpeg", "png", "gif", "bmp", "tiff", "avif", "webp"]
        
        # Criar uma pasta temporária
        temp_dir = os.path.join("temp", session_id)
        os.makedirs(temp_dir, exist_ok=True)

        # Iterar sobre os arquivos na pasta self.path
        for filename in os.listdir(self.path):
            filepath = os.path.join(self.path, filename)
            file_extension = filename.split(".")[-1].lower()
            
            if not file_extension in valid_image_extensions:
                continue
            
            # Verificar se o arquivo é uma imagem válida
            if "." in filename and filename.split(".")[-1].lower() in ["jpg", "jpeg", "png", "gif"]:
                # Copiar a imagem para o diretório temporário
                shutil.copy(filepath, temp_dir)
            else:
                # Converter outros formatos para JPG
                try:
                    with Image.open(filepath) as img:
                        # Converter e salvar como JPG
                        rgb_im = img.convert('RGB')
                        new_filename = os.path.splitext(filename)[0] + '.jpg'
                        rgb_im.save(os.path.join(temp_dir, new_filename))
                except Exception as e:
                    print(f"Erro ao converter {filename}: {e}")

        print(f"Imagens processadas e salvas em {temp_dir}")
        return temp_dir
    
    def upload_image(self, session_id, filename, temp_dir):
        filepath = os.path.join(temp_dir, filename)
        files = {
            'file': (filename, open(filepath, "rb"), "image/jpeg")
        }

        try:
            r = requests.post(
                f"{self.api_url}/upload/{session_id}",
                headers={
                    "Authorization": f"Bearer {self.access_token}"
                },
                files=files,
            )

            if r.ok:
                # Verifique se 'data' é uma lista e obtenha o primeiro item
                data = r.json().get("data", {})
                if isinstance(data, list):
                    file_id = data[0]["id"]
                else:
                    file_id = data["id"]

                return file_id, filename
            else:
                print(f"Erro ao fazer upload de {filename}: {r.json()}")
                return None, filename
        except Exception as e:
            print(f"Erro ao fazer upload de {filename}: {e}")
            return None, filename

    def upload_images(self, session_id, temp_dir):
        # Ordenar os arquivos no diretório temporário usando natsort
        filenames = natsort.natsorted(os.listdir(temp_dir))

        successful = []
        failed = []

        with ThreadPoolExecutor(max_workers=10) as executor:  # Ajuste max_workers conforme necessário
            futures = {executor.submit(self.upload_image, session_id, filename, temp_dir): filename for filename in filenames}

            # Usar tqdm para mostrar o progresso
            for future in tqdm(as_completed(futures), total=len(futures), desc="Uploading images"):
                file_id, filename = future.result()
                if file_id:
                    successful.append((file_id, filename))
                else:
                    failed.append(filename)

        # Ordenar a lista de uploads bem-sucedidos por nome de arquivo
        successful = natsort.natsorted(successful, key=lambda x: x[1])  # Ordenar por filename

        return successful, failed
    
    def commit_upload_session(self, session_id, successful):
        # Ordenar a lista de uploads bem-sucedidos por nome de arquivo
        successful = natsort.natsorted(successful, key=lambda x: x[1])  # Ordenar por filename

        # Criar a ordem das páginas
        page_order = [page[0] for page in successful]  # Extrair apenas os IDs das imagens

        # Dados do rascunho do capítulo
        chapter_draft = {
            "volume": self.volume if self.volume else None,
            "chapter": self.chapter if self.chapter else None,
            "translatedLanguage": self.language,
            "title": self.title
        }

        if self.datetime:
            chapter_draft["publishAt"] = self.datetime

        # Enviar a requisição de commit
        r = requests.post(
            f"{self.api_url}/upload/{session_id}/commit",
            headers={
                "Authorization": f"Bearer {self.access_token}"
            },
            json={
                "chapterDraft": chapter_draft,
                "pageOrder": page_order,
            },
        )

        if r.ok:
            print("Sessão de upload enviada com sucesso, ID da entidade é:", r.json()["data"]["id"])
        else:
            print("Ocorreu um erro ao enviar a sessão de upload.")
            print("Status Code:", r.status_code)
            print(r.json())
    
    def setup(self):
        self.access_token = self.get_access_token()
        
        if self.access_token:
            session_id = self.get_upload_session()
            if session_id:
                self.delete_upload_session(session_id)
                session_id = None
            
            session_id = self.create_upload_session()
            if session_id:
                temp_dir = self.process_images(session_id)
                successful, failed = self.upload_images(session_id, temp_dir)
            
                print(f"Imagens enviadas com sucesso: {len(successful)}")
                print(f"Imagens com falha: {len(failed)}")
                
                self.commit_upload_session(session_id, successful)
                
                shutil.rmtree(temp_dir)
