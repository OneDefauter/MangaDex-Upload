import os
import json
import time
import shutil
import requests
import tempfile
import mimetypes
from tqdm import tqdm
from natsort import natsorted
from concurrent.futures import ThreadPoolExecutor, as_completed
from json.decoder import JSONDecodeError

from src.core.Utils.Others.folders import log_upload_folder

class UploadChapters():
    # def __init__(self, manga_id, manga_title, title, language, groups, volume, chapter, path, datetime, oneshot, status, dir_tmp, config, login, preprocessor, ispre, socket, pre_notif, key) -> None:
    def __init__(self, id, data, socket, preprocessor, config, login) -> None:
        self.id = id
        self.socket = socket
        self.preprocessor = preprocessor
        self.config_core = config
        self.login = login
        
        # Data
        ## Project
        self.manga_id = data['project']['manga_id']
        self.manga_title = data['project']['manga_title']
        
        ## Chapter
        self.title = data['chapter'].get('title', '')
        self.language = data['chapter']['language']
        self.groups = data['chapter']['groups']
        self.volume = data['chapter']['volume']
        self.chapter = data['chapter']['chapter']
        self.oneshot = data['chapter'].get('oneshot', None)
        self.datetime = data['chapter'].get('datetime', None)
        
        ### Path
        self.path = data['chapter']['path']['main']
        self.dir_tmp = data['chapter']['path']['temp']
        
        ## Status
        self.status = data['status']['value']
        
        ## Others
        self.ispre = data['others']['ispre']
        self.iszip = data['others']['iszip']
        
        ## Pre-Notif
        self.pre_notif = data['pre_notif']
        
        self.progress_data = {
            'percentage': 0,
            'completed': 0,
            'total': 0,
            'pages': {}
        }
        
        self.project_folder = os.path.join(log_upload_folder, self.manga_id)
        os.makedirs(self.project_folder, exist_ok=True)

    def status_cancel(self):
        self.status = 2

    def translation_set(self):
        ...

    @staticmethod
    def cronometro(func):
        def wrapper(*args, **kwargs):
            inicio = time.perf_counter()
            resultado = func(*args, **kwargs)
            fim = time.perf_counter()
            print(f"{func.__name__} executado em {fim - inicio:.4f} segundos")
            return resultado
        return wrapper

    def load_config(self):
        return self.config_core.load_config()

    def get_metadata_file(self):
        """Retorna o caminho do arquivo de metadados do projeto."""
        return os.path.join(self.project_folder, "metadata.json")

    def get_latest_log_file(self):
        """Retorna o caminho do último log salvo."""
        return os.path.join(self.project_folder, "latest.json")

    def get_log_files(self):
        """Retorna a lista de arquivos de log ordenados por data (mais antigo → mais recente)."""
        files = [f for f in os.listdir(self.project_folder) if f.endswith(".json") and f != "metadata.json"]
        return sorted(files)

    def save_logs(self, log_data):
        """Salva os logs em um novo arquivo JSON na pasta do projeto."""
        timestamp = time.strftime("%Y%m%d%H%M%S")  # Formato: YYYYMMDDHHMMSS
        log_file = os.path.join(self.project_folder, f"{timestamp}.json")

        # Escreve o log no arquivo novo
        with open(log_file, "w", encoding="utf-8") as file:
            json.dump(log_data, file, indent=4, ensure_ascii=False)

        # Atualiza o "latest.json" para apontar para o último upload
        with open(self.get_latest_log_file(), "w", encoding="utf-8") as file:
            json.dump(log_data, file, indent=4, ensure_ascii=False)

        # Atualiza o metadata.json para manter a hierarquia de uploads
        self.update_metadata(timestamp)

    def update_metadata(self, new_entry):
        """Atualiza a lista de uploads no metadata.json."""
        metadata_file = self.get_metadata_file()
        metadata = {"uploads": []}

        # Carrega os metadados existentes
        if os.path.exists(metadata_file):
            try:
                with open(metadata_file, "r", encoding="utf-8") as file:
                    metadata = json.load(file)
            except JSONDecodeError:
                print(f"[ERRO] JSON corrompido: {metadata_file}. Criando um novo.")
        
        # Adiciona a nova entrada e mantém a lista ordenada
        metadata["uploads"].append(new_entry)
        metadata["uploads"].sort()  # Mantém os uploads em ordem cronológica

        # Salva o metadata atualizado
        with open(metadata_file, "w", encoding="utf-8") as file:
            json.dump(metadata, file, indent=4, ensure_ascii=False)

    def add_log_entry(self, successful, failed):
        """Cria um novo log de upload e o salva."""
        log_data = {
            "manga_id": self.manga_id,
            "name": self.manga_title,
            "language": self.language,
            "chapter": {
                "number": self.chapter,
                "volume": self.volume if self.volume else 'N/A',
                "title": self.title if self.title else 'N/A',
                "id": self.chapter_id_post,
                "total_pages": len(successful) + len(failed),
                "successful_pages": len(successful),
                "failed_pages": len(failed)
            },
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }

        # Salva o log no sistema de arquivos
        self.save_logs(log_data)

    def load_latest_log(self):
        """Carrega o último log salvo."""
        latest_file = self.get_latest_log_file()
        if os.path.exists(latest_file):
            with open(latest_file, "r", encoding="utf-8") as file:
                return json.load(file)
        return {}

    def load_all_logs(self):
        """Carrega todos os logs de um manga_id."""
        logs = []
        for log_file in self.get_log_files():
            log_path = os.path.join(self.project_folder, log_file)
            try:
                with open(log_path, "r", encoding="utf-8") as file:
                    logs.append(json.load(file))
            except JSONDecodeError:
                print(f"[ERRO] Arquivo corrompido: {log_path}. Ignorando...")
        return logs

    def delete_folder(self):
        try:
            shutil.rmtree(self.temp_dir)
        except FileNotFoundError:
            print(f"A pasta {self.temp_dir} não foi encontrada.")
        except PermissionError:
            print(f"Permissão negada ao tentar remover a pasta {self.temp_dir}.")
        except Exception as e:
            print(f"Erro inesperado ao tentar remover {self.temp_dir}: {e}")

        if self.dir_tmp:
            try:
                if os.path.exists(self.dir_tmp) and self.ispre:
                    shutil.rmtree(self.dir_tmp)
            except FileNotFoundError:
                print(f"A pasta {self.dir_tmp} não foi encontrada.")
            except PermissionError:
                print(f"Permissão negada ao tentar remover a pasta {self.dir_tmp}.")
            except Exception as e:
                print(f"Erro inesperado ao tentar remover {self.dir_tmp}: {e}")

        self.socket.emit('get_folder_size')

    def get_upload_session(self):
        for attempt in range(self.config['retry']):
            try:
                r = requests.get(
                    f"{self.config['api_url']}/upload",
                    headers={
                        "Authorization": f"Bearer {self.access_token}"
                    },
                    timeout=10
                )
                
                if r.ok:
                    session_id = r.json()["data"]["id"]
                    return session_id

            except requests.exceptions.Timeout:
                print(f"Tentativa {attempt + 1}: Erro ao obter a sessão de upload.")
                time.sleep(2)
            
            except:
                time.sleep(2)

        if r.status_code == (401, 403, 404):
            print("Não autorizado") if r.status_code == 401 else None
            print("Token expirado") if r.status_code == 403 else None
            print("Token não encontrado") if r.status_code == 404 else None
            return None
    
    def delete_upload_session(self, session_id):
        for attempt in range(self.config['retry']):
            try:
                r = requests.delete(
                    f"{self.config['api_url']}/upload/{session_id}",
                    headers={
                        "Authorization": f"Bearer {self.access_token}"
                    },
                    timeout=10
                )
                return
            except:
                time.sleep(2)
    
    @cronometro
    def create_upload_session(self):
        for attempt in range(self.config['retry']):
            try:
                r = requests.post(
                    f"{self.config['api_url']}/upload/begin",
                    headers={
                        "Authorization": f"Bearer {self.access_token}"
                    },
                    json={
                        "groups": [grupo['id'] for grupo in self.groups],
                        "manga": self.manga_id
                    },
                    timeout=30
                )

                # Se deu certo (2xx)
                if r.ok:
                    session_id = r.json()["data"]["id"]
                    return session_id

                # Se deu erro, trata cada status separadamente
                elif r.status_code == 401:
                    # Se quiser aproveitar a mensagem 'detail' da API:
                    try:
                        detail = r.json()["errors"][0].get("detail", "")
                    except:
                        detail = ""
                    # Exemplo de retorno para status=401
                    return {
                        "st": 3,
                        "e": None,
                        "d": f"Usuário não tem permissão para enviar esse capítulo. {detail}"
                    }

                elif r.status_code == 403:
                    return {
                        "st": 3,
                        "e": None,
                        "d": "Token expirado ou usuário não autorizado."
                    }

                elif r.status_code == 404:
                    return {
                        "st": 3,
                        "e": None,
                        "d": "Token ou recurso não encontrado."
                    }

                else:
                    # Se for outro status não previsto, você pode apenas logar ou retornar algo genérico
                    # Exemplo:
                    return {
                        "st": 3,
                        "e": r.status_code,
                        "d": f"Erro inesperado. HTTP {r.status_code}"
                    }

            except requests.exceptions.Timeout:
                print("Timeout: O servidor demorou muito para responder.")

            except Exception as e:
                print(f"Tentativa {attempt + 1}: Ocorreu um erro ao criar a sessão de upload: {e}")

            # Espera 5 segundos antes de tentar novamente
            time.sleep(5)

        # Se chegou aqui, é porque todas as tentativas falharam
        return None

    @cronometro
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

    def upload_image(self, session_id, filename, temp_dir):
        """
        Faz o upload de uma imagem para a API do servidor.

        Essa função abre o arquivo de imagem, envia para a API através de uma requisição **POST** 
        e, em caso de falha, tenta novamente até um número máximo de tentativas (`self.config['retry']`).

        Parâmetros:
        ------------
        - `session_id` (`str`): Identificador da sessão de upload.
        - `filename` (`str`): Nome do arquivo de imagem a ser enviado.
        - `temp_dir` (`str`): Diretório temporário onde o arquivo está armazenado.

        Fluxo de execução:
        -------------------
        1. **Constrói o caminho completo do arquivo** usando `temp_dir` e `filename`.
        2. **Determina o tipo MIME do arquivo** (`mimetypes.guess_type`).
        3. **Executa um loop de tentativas (`retry`)**:
            - **Abre o arquivo em modo binário (`rb`)**.
            - **Cria um dicionário `files` contendo o arquivo** para envio na requisição.
            - **Faz uma requisição `POST` para a API** (`requests.post`), enviando:
                - URL: `f"{self.config['api_url']}/upload/{session_id}"`
                - Cabeçalho: `{ "Authorization": f"Bearer {self.access_token}" }`
                - Arquivo: `files=files`
            - **Se a requisição for bem-sucedida (`r.ok`)**:
                - Obtém a resposta JSON e extrai o ID do arquivo enviado:
                    - Se `data` for uma lista, pega o primeiro item (`data[0]['id']`).
                    - Caso contrário, usa `data['id']`.
                - **Atualiza o progresso do upload** (`progress_data`).
                - **Emite um evento via WebSocket** (`socket.emit('send_progress_update')`).
                - **Retorna o ID do arquivo e o nome do arquivo**.
            - **Se a requisição falhar**, imprime o erro e tenta novamente após 2 segundos.

        4. **Se todas as tentativas falharem**, retorna `None, filename` e imprime um erro.

        Exemplo de Requisição Enviada:
        -------------------------------
        ```json
        {
            "url": "https://exemplo.com/upload/123456",
            "headers": { "Authorization": "Bearer SEU_TOKEN_AQUI" },
            "files": {
                "file": ("imagem.jpg", <conteúdo do arquivo>, "image/jpeg")
            }
        }
        ```

        Exemplo de Resposta da API (`r.json()`):
        ----------------------------------------
        ```json
        {
            "data": {
                "id": "abcd1234efgh5678",
                "filename": "imagem.jpg"
            }
        }
        ```

        Tratamento de Erros:
        ---------------------
        - Se ocorrer **falha na requisição**, a função tenta novamente até atingir o número máximo de tentativas (`retry`).
        - Se **`data` estiver ausente** ou não contiver um ID válido, o upload pode ser considerado malsucedido.
        - Se um erro inesperado ocorrer (`Exception`), ele será impresso e uma nova tentativa será feita após **2 segundos**.

        Retorno:
        --------
        - Se o upload for **bem-sucedido**:
            ```python
            return file_id, filename
            ```
        - Se todas as tentativas falharem:
            ```python
            return None, filename
            ```
        """

        filepath = os.path.join(temp_dir, filename)
        mime_type, _ = mimetypes.guess_type(filepath)

        for attempt in range(self.config['retry']):
            try:
                with open(filepath, "rb") as file:
                    files = {
                        'file': (filename, file, mime_type)
                    }
                    r = requests.post(
                        f"{self.config['api_url']}/upload/{session_id}",
                        headers={"Authorization": f"Bearer {self.access_token}"},
                        files=files,
                        timeout=(10, 300)  # 10s para conectar, 180s (3 minutos) para esperar resposta
                    )
                
                    if r.ok:
                        # Verifique se 'data' é uma lista e obtenha o primeiro item
                        data = r.json().get("data", {})
                        if isinstance(data, list):
                            file_id = data[0]["id"]
                        else:
                            file_id = data["id"]

                        self.progress_data['completed'] += 1
                        self.progress_data['percentage'] = int((self.progress_data['completed'] / self.progress_data['total']) * 100)
                        self.socket.emit('send_progress_update', data={"key": self.id, "progress": self.progress_data})

                        return file_id, filename
                    else:
                        print(f"Tentativa {attempt + 1}: Erro ao fazer upload de {filename}: {r.json()}")

            except requests.exceptions.Timeout:
                print(f"Timeout: O servidor demorou muito para responder ao enviar {filename}.")

            except Exception as e:
                print(f"Tentativa {attempt + 1}: Erro ao fazer upload de {filename}: {e}")

            # Espera 5 segundos antes da próxima tentativa
            time.sleep(5)

        # Se todas as tentativas falharem, retorna None
        print(f"Falha ao fazer upload de {filename} após {self.config['retry']} tentativas.")
        return None, filename

    @cronometro
    def upload_images(self, session_id, temp_dir):
        """
        Faz o upload das imagens após verificar e reduzir o tamanho total do capítulo.

        O processo segue os seguintes passos:
        1. **Verifica o tamanho total das imagens no diretório.**  
        - Caso o tamanho total do capítulo exceda 200MB, tenta reduzir as maiores imagens iterativamente.  
        - Se, após a tentativa de redução, o tamanho ainda estiver acima do limite, o upload é cancelado.  

        2. **Carrega os arquivos restantes para upload.**  
        - As imagens no diretório `temp_dir` são listadas e ordenadas numericamente.  
        - Se não houver arquivos disponíveis, o upload é cancelado.  

        3. **Inicia o processo de upload em paralelo.**  
        - Um `ThreadPoolExecutor` gerencia múltiplas threads para upload simultâneo.  
        - O número de threads (`max_workers`) é definido na configuração (`self.config`).  
        - Cada imagem é enviada de forma assíncrona e o progresso é acompanhado com `tqdm`.  

        4. **Coleta os resultados dos uploads.**  
        - Se um upload for bem-sucedido, o ID do arquivo e o nome são armazenados em `successful`.  
        - Se um upload falhar, o nome do arquivo é armazenado em `failed`.  
        - Os resultados finais são ordenados naturalmente antes de serem retornados.  

        Args:
            session_id (str): ID da sessão que identifica o upload atual.
            temp_dir (str): Caminho do diretório onde as imagens a serem enviadas estão armazenadas.

        Returns:
            tuple: 
                - successful (list): Lista de tuplas contendo (file_id, filename) das imagens enviadas com sucesso.
                - failed (list): Lista contendo os nomes das imagens que falharam no upload.

        Notas:
            - Se nenhuma imagem for encontrada no `temp_dir`, o upload será cancelado e o diretório será removido.
            - Se o tamanho total do capítulo exceder 200MB e não puder ser reduzido, o upload será cancelado.
            - A quantidade de uploads simultâneos (`max_workers`) pode ser configurada na chave `"upload"` de `self.config`.

        Exemplo de retorno:
            successful = [
                ("12345", "capitulo_01.jpg"),
                ("12346", "capitulo_02.jpg"),
            ]

            failed = [
                "capitulo_05.jpg",
                "capitulo_07.jpg",
            ]
        """

        # Verificar se o tamanho total do capítulo está dentro do limite
        total_size_mb = self.preprocessor.calculate_total_size(temp_dir)
        if total_size_mb >= 200:
            self.pre_notif['status'] = 2
            self.pre_notif['detail'] = "O tamanho total do capítulo excede 200MB."
            self.socket.emit('get_notification', self.pre_notif)
            self.status_cancel()
            shutil.rmtree(temp_dir)
            return [], []  # Retorna listas vazias para sucesso e falha

        # Continuar com o upload
        filenames = natsorted(os.listdir(temp_dir))

        self.progress_data['total'] = len(filenames)
        successful = []
        failed = []

        max_workers = self.config.get("upload", 5)

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {}

            for filename in filenames:
                if len(os.listdir(temp_dir)) == 0:
                    print(f"Nenhuma imagem encontrada (problema ao copiar ou converter).")
                    self.pre_notif['status'] = 2
                    self.pre_notif['detail'] = "Nenhuma imagem encontrada (problema ao copiar ou converter)."
                    self.socket.emit('get_notification', self.pre_notif)
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

        successful = natsorted(successful, key=lambda x: x[1])

        return successful, failed

    def commit_upload_session(self, session_id, successful):
        # Ordenar a lista de uploads bem-sucedidos por nome de arquivo
        successful = natsorted(successful, key=lambda x: x[1])  # Ordenar por filename

        # Criar a ordem das páginas
        page_order = [page[0] for page in successful]  # Extrair apenas os IDs das imagens

        # Dados do rascunho do capítulo
        chapter_draft = {
            "volume": self.volume.lstrip("0") if self.volume else None,
            "chapter": str(int(self.chapter)) if self.chapter and self.chapter.isdigit() else self.chapter,
            "translatedLanguage": self.language,
            "title": self.title
        }

        if self.datetime:
            chapter_draft["publishAt"] = self.datetime

        for attempt in range(self.config['retry']):
            try:
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
                    timeout=10
                )

                if r.ok:
                    self.chapter_id_post = r.json()["data"]["id"]
                    print("Sessão de upload enviada com sucesso, ID do capítulo é:", r.json()["data"]["id"])
                    return
                else:
                    print("Ocorreu um erro ao enviar a sessão de upload.")
                    print("Status Code:", r.status_code)
                    print(r.json())

            except requests.exceptions.Timeout:
                print(f"Timeout: O servidor demorou muito para responder.")

            except Exception as e:
                print(f"Tentativa {attempt + 1}: Ocorreu um erro ao enviar a sessão de upload: {e}")
            
            # Espera 10 segundos antes da próxima tentativa
            time.sleep(10)

    def setup(self):
        self.config = self.load_config()
        self.pre_notif['status'] = 3
        self.socket.emit('get_notification', self.pre_notif)

        if self.status == 2:
            print("Upload cancelado.")
            self.pre_notif['status'] = 2
            self.pre_notif['detail'] = 'Cancelado pelo usuário'
            self.socket.emit('get_notification', self.pre_notif)
            return {'st': 3, 'e': None, 'd': 'Cancelado pelo usuário'}

        self.access_token = self.get_access_token()

        if self.status == 2:
            print("Upload cancelado.")
            self.pre_notif['status'] = 2
            self.pre_notif['detail'] = 'Cancelado pelo usuário'
            self.socket.emit('get_notification', self.pre_notif)
            return {'st': 3, 'e': None, 'd': 'Cancelado pelo usuário'}

        if self.access_token:
            session_id = self.get_upload_session()
            if session_id:
                self.delete_upload_session(session_id)
                session_id = None

            if self.status == 2:
                print("Upload cancelado.")
                self.pre_notif['status'] = 2
                self.pre_notif['detail'] = 'Cancelado pelo usuário'
                self.socket.emit('get_notification', self.pre_notif)
                return {'st': 3, 'e': None, 'd': 'Cancelado pelo usuário'}

            session_id = self.create_upload_session()
            if isinstance(session_id, dict):
                return session_id

            if session_id:
                if not self.ispre:
                    if not self.iszip:
                        self.temp_dir = tempfile.mkdtemp(prefix='MDU_')
                        success, error_message = self.preprocessor.preprocess_image_folder(self.path, self.temp_dir)
                        
                        if self.status == 2:
                            print("Upload cancelado.")
                            self.pre_notif['status'] = 2
                            self.pre_notif['detail'] = 'Cancelado pelo usuário'
                            self.socket.emit('get_notification', self.pre_notif)
                            return {'st': 3, 'e': None, 'd': 'Cancelado pelo usuário'}

                        if not success:
                            self.pre_notif['status'] = 2
                            self.pre_notif['detail'] = error_message
                            self.socket.emit('get_notification', self.pre_notif)
                            return {'st': 2, 'e': error_message, 'd': None}
                    
                    else:
                        self.temp_dir = tempfile.mkdtemp(prefix='MDU_')
                        success, error_message = self.preprocessor.extract_archive(self.path, self.temp_dir, force_preprocess=self.iszip)

                        if self.status == 2:
                            print("Upload cancelado.")
                            self.pre_notif['status'] = 2
                            self.pre_notif['detail'] = 'Cancelado pelo usuário'
                            self.socket.emit('get_notification', self.pre_notif)
                            return {'st': 3, 'e': None, 'd': 'Cancelado pelo usuário'}

                        if not success:
                            self.pre_notif['status'] = 2
                            self.pre_notif['detail'] = error_message
                            self.socket.emit('get_notification', self.pre_notif)
                            return {'st': 2, 'e': error_message, 'd': None}

                else:
                    self.temp_dir = self.dir_tmp

                if self.status == 2:
                    print("Upload cancelado.")
                    self.pre_notif['status'] = 2
                    self.pre_notif['detail'] = 'Cancelado pelo usuário'
                    self.socket.emit('get_notification', self.pre_notif)
                    return {'st': 3, 'e': None, 'd': 'Cancelado pelo usuário'}

                successful, failed = self.upload_images(session_id, self.temp_dir)

                if self.status == 2:
                    print("Upload cancelado.")
                    self.pre_notif['status'] = 2
                    self.pre_notif['detail'] = 'Cancelado pelo usuário'
                    self.socket.emit('get_notification', self.pre_notif)
                    return {'st': 3, 'e': None, 'd': 'Cancelado pelo usuário'}

                print(f"Imagens enviadas com sucesso: {len(successful)}")
                print(f"Imagens com falha: {len(failed)}")

                if len(failed) >= 1 and self.config['upload_on_error'] is False:
                    print("Upload cancelado.")
                    self.delete_upload_session(session_id)
                    self.delete_folder()
                    msg = "1 imagem falhou" if len(failed) == 1 else f"{len(failed)} imagens falharam"
                    self.pre_notif['status'] = 2
                    self.pre_notif['detail'] = msg
                    self.socket.emit('get_notification', self.pre_notif)
                    return {'st': 3, 'e': None, 'd': msg}
                
                elif len(successful) == 0 and len(failed) == 0:
                    print("Nenhuma imagem encontrada.")
                    self.delete_upload_session(session_id)
                    self.delete_folder()
                    return {'st': 3, 'e': 'Nenhuma imagem encontrada', 'd': None}

                if self.status == 2:
                    print("Upload cancelado.")
                    self.pre_notif['status'] = 2
                    self.pre_notif['detail'] = 'Cancelado pelo usuário'
                    self.socket.emit('get_notification', self.pre_notif)
                    return {'st': 2, 'e': None, 'd': 'Cancelado pelo usuário'}

                self.commit_upload_session(session_id, successful)

                self.delete_folder()

                self.add_log_entry(successful, failed)
                self.pre_notif['status'] = 0
                self.socket.emit('get_notification', self.pre_notif)
                return {'st': 1, 'e': None, 'd': None}

            else:
                print("Upload cancelado.")
                return {'st': 2, 'e': 'Occoreu um erro ao criar a sessão de upload.', 'd': None}