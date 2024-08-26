import os
import json
import time
import shutil
import natsort
import requests
from PIL import Image
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor, as_completed

from src.core.Utils.Others.folders import log_upload_file

class UploadChapters():
    def __init__(self, manga_id, manga_title, title, language, groups, volume, chapter, path, datetime, oneshot, status, dir_tmp, config, login) -> None:
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
        self.status = status
        self.dir_tmp = dir_tmp
        self.config_core = config
        self.login = login
        
        # Max height
        self.height_max = 10000

        # Number of desired parts
        self.num_parts = 5
    
    def status_cancel(self):
        self.status = 2

    def load_config(self):
        return self.config_core.load_config()

    def load_logs(self):
        if os.path.exists(log_upload_file):
            with open(log_upload_file, "r", encoding="utf-8") as file:
                return json.load(file)
        return {}

    def save_logs(self, logs):
        with open(log_upload_file, "w", encoding="utf-8") as file:
            json.dump(logs, file, indent=4, ensure_ascii=False)

    def add_log_entry(self, successful, failed):
        logs = self.load_logs()

        work_id = f"{self.manga_id}_{self.language}"

        if work_id not in logs:
            logs[work_id] = {
                "name": self.manga_title,
                "chapters": []
            }

        chapter_log = {
            "number": self.chapter,
            "volume": self.volume if self.volume else 'N/A',
            "title": self.title if self.title else 'N/A',
            "id": self.chapter_id_post,
            "total_pages": len(successful) + len(failed),
            "successful_pages": len(successful),
            "failed_pages": len(failed)
        }

        logs[work_id]["chapters"].append(chapter_log)
        
        self.save_logs(logs)

    def delete_folder(self):
        shutil.rmtree(self.temp_dir)
                    
        if self.dir_tmp:
            shutil.rmtree(self.dir_tmp)

    def get_upload_session(self):
        r = requests.get(
            f"{self.config['api_url']}/upload",
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
            f"{self.config['api_url']}/upload/{session_id}",
            headers={
                "Authorization": f"Bearer {self.access_token}"
            },
        )
    
    def create_upload_session(self):
        r = requests.post(
            f"{self.config['api_url']}/upload/begin",
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
            if self.status != 2:
                filepath = os.path.join(self.path, filename)
                file_extension = filename.split(".")[-1].lower()
                
                if not file_extension in valid_image_extensions:
                    continue
                
                # Verificar se o arquivo é uma imagem válida
                if "." in filename and filename.split(".")[-1].lower() in ["jpg", "jpeg", "png", "gif"]:
                    # Verificar o tamanho da imagem
                    n = self.check_image(filepath, temp_dir, file_extension)
                    if n == 1:
                        # Copiar a imagem para o diretório temporário
                        shutil.copy(filepath, temp_dir)
                else:
                    # Verificar o tamanho da imagem
                    n = self.check_image(filepath, temp_dir, "jpg")
                    if n == 1:
                        # Converter outros formatos para JPG
                        try:
                            with Image.open(filepath) as img:
                                # Converter e salvar como JPG
                                rgb_im = img.convert('RGB')
                                new_filename = os.path.splitext(filename)[0] + '.jpg'
                                rgb_im.save(os.path.join(temp_dir, new_filename))
                        except Exception as e:
                            print(f"Erro ao converter {filename}: {e}")

        if self.status != 2:
            print(f"Imagens processadas e salvas em {temp_dir}")
            return temp_dir
        else:
            shutil.rmtree(temp_dir)
            return None

    def check_image(self, filepath, temp_dir, extension = "jpg"):
        try:
            image_size = Image.open(filepath)
            height = image_size.height
            image_size.close()
            if height > self.height_max:
                self.cup_image(filepath, temp_dir, extension)
                return 0
        except:
            return 1
        
        return 1
    
    def cup_image(self, filepath, temp_dir, extension):
        # Open the image
        image_size = Image.open(filepath)
        
        # Get the dimensions of the image
        width, height = image_size.size
        
        # Height of each part
        height_part = height // self.num_parts
        
        # Loop to crop the image into parts
        for i in range(self.num_parts):
            # Set the cropping coordinates for the current part
            left = 0
            top = i * height_part
            right = width
            bottom = (i + 1) * height_part

            # Crop the current part
            current_part = image_size.crop((left, top, right, bottom))

            # Save the current part with the desired name
            filename = os.path.basename(filepath)
            name, ext = os.path.splitext(filename)
            part_path = os.path.join(temp_dir, f"{name}-{i}.{extension}")
            current_part.save(part_path)

            # Close the image of the current part
            current_part.close()

    def upload_image(self, session_id, filename, temp_dir):
        filepath = os.path.join(temp_dir, filename)
        files = {
            'file': (filename, open(filepath, "rb"), "image/jpeg")
        }

        for attempt in range(self.config['retry']):
            try:
                r = requests.post(
                    f"{self.config['api_url']}/upload/{session_id}",
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
                    print(f"Tentativa {attempt}: Erro ao fazer upload de {filename}: {r.json()}")

            except Exception as e:
                print(f"Tentativa {attempt}: Erro ao fazer upload de {filename}: {e}")

            # Espera 2 segundos antes da próxima tentativa
            time.sleep(2)

        # Se todas as tentativas falharem, retorna None
        print(f"Falha ao fazer upload de {filename} após {self.config['retry']} tentativas.")
        return None, filename

    def check_and_compress_image(self, filepath, max_size_mb=20):
        file_size_mb = os.path.getsize(filepath) / (1024 * 1024)
        
        if file_size_mb > max_size_mb:
            print(f"{os.path.basename(filepath)}: {file_size_mb:.2f}MB, Reduzindo tamanho...")
            try:
                with Image.open(filepath) as img:
                    quality = 85  # Qualidade inicial da imagem
                    while file_size_mb > max_size_mb and quality > 10:
                        temp_file = os.path.join(os.path.dirname(filepath), "temp.jpg")
                        img.save(temp_file, format="JPEG", quality=quality)
                        file_size_mb = os.path.getsize(temp_file) / (1024 * 1024)
                        quality -= 5
                    
                    if file_size_mb <= max_size_mb:
                        shutil.move(temp_file, filepath)
                    else:
                        print(f"Não foi possível reduzir {os.path.basename(filepath)} abaixo de {max_size_mb}MB.")
            
            except Exception as e:
                print(f"Erro ao reduzir tamanho de {os.path.basename(filepath)}: {e}")
        
        # Verifica se o arquivo resultante é válido e não está vazio
        if os.path.getsize(filepath) == 0:
            print(f"Erro: O arquivo {os.path.basename(filepath)} está vazio após compressão.")
            return None  # Retorna None para indicar que o arquivo é inválido
        
        return file_size_mb

    def upload_images(self, session_id, temp_dir):
        filenames = natsort.natsorted(os.listdir(temp_dir))
        
        successful = []
        failed = []
        
        total_size_mb = 0

        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = {}
            
            for filename in filenames:
                filepath = os.path.join(temp_dir, filename)
                
                # Verificar e reduzir o tamanho da imagem se necessário
                image_size_mb = self.check_and_compress_image(filepath)
                if image_size_mb is None:
                    print(f"{filename} foi removido da fila por estar vazio.")
                    failed.append(filename)
                    continue  # Pule esta imagem se ela for inválida
                
                total_size_mb += image_size_mb
                
                # Verifica se o tamanho total do capítulo excede 200MB
                if total_size_mb > 200:
                    print(f"O tamanho total do capítulo excede 200MB. Upload cancelado.")
                    self.status_cancel()
                    shutil.rmtree(temp_dir)
                    return successful, failed
                
                futures[executor.submit(self.upload_image, session_id, filename, temp_dir)] = filename
            
            for future in tqdm(as_completed(futures), total=len(futures), desc="Uploading images"):
                file_id, filename = future.result()
                if file_id:
                    successful.append((file_id, filename))
                else:
                    failed.append(filename)
        
        successful = natsort.natsorted(successful, key=lambda x: x[1])
        
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
            f"{self.config['api_url']}/upload/{session_id}/commit",
            headers={
                "Authorization": f"Bearer {self.access_token}"
            },
            json={
                "chapterDraft": chapter_draft,
                "pageOrder": page_order,
            },
        )

        if r.ok:
            self.chapter_id_post = r.json()["data"]["id"]
            print("Sessão de upload enviada com sucesso, ID da entidade é:", r.json()["data"]["id"])
        else:
            print("Ocorreu um erro ao enviar a sessão de upload.")
            print("Status Code:", r.status_code)
            print(r.json())
    
    def setup(self):
        self.config = self.load_config()
        
        self.access_token = self.get_access_token()
        
        if self.access_token and self.status != 2:
            session_id = self.get_upload_session()
            if session_id:
                self.delete_upload_session(session_id)
                session_id = None
            
            session_id = self.create_upload_session()
            if session_id and self.status != 2:
                self.temp_dir = self.process_images(session_id)
                if self.status != 2 or self.temp_dir is not None:
                    successful, failed = self.upload_images(session_id, self.temp_dir)
                
                    print(f"Imagens enviadas com sucesso: {len(successful)}")
                    print(f"Imagens com falha: {len(failed)}")
                    
                    if len(failed) >= 1 and self.config['upload_on_error'] is False:
                        print("Upload cancelado.")
                        self.delete_upload_session(session_id)
                        self.delete_folder()
                        return 'canceled'
                    
                    self.commit_upload_session(session_id, successful)
                    
                    self.delete_folder()
                    
                    self.add_log_entry(successful, failed)
                    return 'success'
                    
                else:
                    print("Upload cancelado.")
                    return 'canceled'