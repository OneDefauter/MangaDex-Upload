import os
import json
import random
import string
import tempfile
import threading
from json.decoder import JSONDecodeError
from time import sleep

from src.core.Utils.Others.folders import settings_dir, queues_uploads, queues_downloads

class QueueCore():
    def __init__(self, socket):
        self.SOCKET = socket
        self.lock = threading.Lock()

        # Criar pastas para uploads e downloads se não existirem
        os.makedirs(queues_uploads, exist_ok=True)
        os.makedirs(queues_downloads, exist_ok=True)

    def reset(self, lock=True):
        """
        Remove todas as pastas dentro de 'queues/uploads' e 'queues/downloads',
        resetando completamente os dados armazenados.
        """
        def clear_section(section_path):
            """Remove todas as pastas e arquivos JSON dentro da seção especificada (uploads ou downloads)."""
            if os.path.exists(section_path):
                for manga_id in os.listdir(section_path):
                    manga_path = os.path.join(section_path, manga_id)
                    
                    if os.path.isdir(manga_path):  # Certifica que é uma pasta
                        try:
                            # Remove todos os arquivos JSON dentro da pasta do mangá
                            for filename in os.listdir(manga_path):
                                file_path = os.path.join(manga_path, filename)
                                if filename.endswith(".json"):
                                    os.remove(file_path)
                                    print(f"[INFO] Removido: {file_path}")

                            # Após apagar os arquivos, remover a pasta do mangá
                            os.rmdir(manga_path)
                            print(f"[INFO] Pasta removida: {manga_path}")

                        except Exception as e:
                            print(f"[ERRO] Não foi possível remover {manga_path}: {e}")

        if lock:
            with self.lock:
                # Apagar todas as pastas e arquivos JSON de uploads e downloads
                clear_section(queues_uploads)
                clear_section(queues_downloads)
                print("[INFO] Todas as filas foram resetadas com sucesso!")
        else:
            # Apagar todas as pastas e arquivos JSON de uploads e downloads
            clear_section(queues_uploads)
            clear_section(queues_downloads)
            print("[INFO] Todas as filas foram resetadas com sucesso!")

    def load(self, lock=True):
        """
        Carrega todos os arquivos JSON dentro das pastas 'queues/uploads' e 'queues/downloads',
        reconstruindo a estrutura completa.
        """
        queues = {
            "downloads": {},
            "uploads": {}
        }

        def load_section(section_path, max_retries=3, retry_delay=2):
            """Carrega os arquivos JSON organizados por pastas de manga_id."""
            if not os.path.exists(section_path):
                return {}

            combined_data = {}

            for manga_id in os.listdir(section_path):
                manga_path = os.path.join(section_path, manga_id)
                if os.path.isdir(manga_path):  # Certifica que é uma pasta
                    for filename in os.listdir(manga_path):
                        if filename.endswith(".json"):
                            file_path = os.path.join(manga_path, filename)
                            
                            # Tentativa de carregamento com retries
                            for attempt in range(1, max_retries + 1):
                                try:
                                    with open(file_path, "r", encoding="utf-8") as f:
                                        data = json.load(f)
                                        combined_data[filename.replace(".json", "")] = data
                                    break  # Se deu certo, sai do loop de tentativas
                                except JSONDecodeError:
                                    print(f"[ERRO] Arquivo corrompido: {file_path}. Ignorando...")
                                    break  # Não adianta tentar novamente se o JSON está quebrado
                                except Exception as e:
                                    print(f"[ERRO] Falha ao carregar {file_path} (Tentativa {attempt}/{max_retries}): {e}")
                                    if attempt < max_retries:
                                        sleep(retry_delay)  # Espera antes de tentar de novo
                                    else:
                                        print(f"[FALHA] Não foi possível carregar {file_path} após {max_retries} tentativas.")
            
            sleep(0.250)  # Aguardar 0.250 segundo para evitar problemas de concorrência
            return combined_data

        if lock:
            with self.lock:
                # Carregar uploads e downloads
                queues["uploads"] = load_section(queues_uploads)
                queues["downloads"] = load_section(queues_downloads)
                return queues
        else:
            # Carregar uploads e downloads
                queues["uploads"] = load_section(queues_uploads)
                queues["downloads"] = load_section(queues_downloads)
                return queues

    def save(self, queues, lock=True):
        """
        Salva os dados dividindo os arquivos JSON, onde cada manga_id tem uma pasta 
        e cada ID de capítulo é salvo em um JSON separado.
        """
        def save_section(section_path, section_data):
            """Salva os dados em arquivos JSON, organizando por pasta de manga_id."""
            if not os.path.exists(section_path):
                os.makedirs(section_path, exist_ok=True)

            for unique_id, entry in section_data.items():
                manga_id = str(entry["project"]["manga_id"])  # Garante que seja string
                manga_path = os.path.join(section_path, manga_id)

                # Criar a pasta do manga_id se não existir
                if not os.path.exists(manga_path):
                    os.makedirs(manga_path, exist_ok=True)

                file_path = os.path.join(manga_path, f"{unique_id}.json")

                # Salvar cada ID em um JSON separado
                try:
                    with open(file_path, "w", encoding="utf-8") as f:
                        json.dump(entry, f, indent=4, ensure_ascii=False)
                except Exception as e:
                    print(f"[ERRO] Falha ao salvar {file_path}: {e}")
            
            sleep(0.250)  # Aguardar 0.250 segundo para evitar problemas de concorrência

        if lock:
            with self.lock:
                save_section(queues_uploads, queues["uploads"])
                save_section(queues_downloads, queues["downloads"])
        else:
            save_section(queues_uploads, queues["uploads"])
            save_section(queues_downloads, queues["downloads"])

    def generate_unique_id(self, queues = False, length = 5):
        """
        Gera um ID único com o número de caracteres especificado.
        Verifica se o ID já existe no dicionário 'queues'.
        """
        with self.lock:
            if not queues:
                queues = self.load(False)
            
            while True:
                # Gera um ID aleatório com números (00001, 12345 etc.)
                new_id = ''.join(random.choices(string.digits, k=length))
                # Verifica se o ID existe no JSON (uploads ou downloads)
                if new_id not in queues.get('uploads', {}) and new_id not in queues.get('downloads', {}):
                    return new_id

    def check_on_login(self):
        """
        Verifica se todos os valores de 'status.value' em uploads e downloads
        são iguais a 1. Se forem, o arquivo será resetado para o padrão.
        """
        with self.lock:
            queues = self.load(False)

            # Verifica uploads (filtra os itens cujo status não é 1)
            non_reset_uploads = {
                key: entry for key, entry in queues.get('uploads', {}).items()
                if entry.get('status', {}).get('value') != 1
            }

            # Verifica downloads (filtra os itens cujo status não é 1)
            non_reset_downloads = {
                key: entry for key, entry in queues.get('downloads', {}).items()
                if entry.get('status', {}).get('value') != 1
            }

            # Reseta o arquivo se todos os valores forem 1
            if not non_reset_uploads and not non_reset_downloads:
                self.reset(False)
                self.SOCKET.emit("check_queue_data")
                return True
            else:
                # Envia os itens que não estão com o status 1
                non_reset_data = {
                    "downloads": non_reset_downloads,
                    "uploads": non_reset_uploads
                }
                self.SOCKET.emit("check_on_login_data", non_reset_data)
                print("Nem todos os status são 1. Itens não resetados enviados.")
                return False

    def get_by_id(self, id):
        """
        Busca um item pelo ID específico dentro de uploads e downloads.
        Retorna o item encontrado ou None caso o ID não exista.
        """
        with self.lock:
            queues = self.load(False)

            # Busca em uploads
            if id in queues.get('uploads', {}):
                return queues['uploads'][id]

            # Busca em downloads
            if id in queues.get('downloads', {}):
                return queues['downloads'][id]

            # Retorna None se o ID não for encontrado
            return None

    def deep_merge(self, original, updates):
        """
        Realiza uma mesclagem profunda entre dois dicionários.
        Atualiza apenas os campos especificados em 'updates', preservando os existentes.
        """
        for key, value in updates.items():
            if isinstance(value, dict) and key in original:
                # Se o valor for um dicionário, faz a mesclagem recursiva
                original[key] = self.deep_merge(original[key], value)
            else:
                # Caso contrário, apenas atualiza o valor
                original[key] = value
        return original

    def update_field(self, unique_id, section, updates):
        """
        Atualiza um ou mais campos específicos de um item no JSON baseado no ID,
        preservando os dados existentes e salvando apenas o arquivo correspondente.

        :param unique_id: O ID do item que será atualizado.
        :param section: A seção onde o item está ('uploads' ou 'downloads').
        :param updates: Um dicionário contendo os campos e valores a serem atualizados.
        """
        with self.lock:
            if section not in ["uploads", "downloads"]:
                print(f"[ERRO] Seção '{section}' inválida. Use 'uploads' ou 'downloads'.")
                return

            section_path = queues_uploads if section == "uploads" else queues_downloads

            # Procurar o item dentro de todas as pastas de mangá
            found = False
            for manga_id in os.listdir(section_path):
                manga_path = os.path.join(section_path, manga_id)
                if os.path.isdir(manga_path):  # Verifica se é uma pasta
                    file_path = os.path.join(manga_path, f"{unique_id}.json")

                    if os.path.exists(file_path):
                        try:
                            with open(file_path, "r", encoding="utf-8") as f:
                                data = json.load(f)

                            # Guardar os dados antigos para log (opcional)
                            old_data = json.dumps(data, indent=4, ensure_ascii=False)
                            
                            # Atualiza os campos utilizando a função deep_merge
                            data = self.deep_merge(data, updates)

                            # Escrita atômica: cria um arquivo temporário no mesmo diretório
                            dir_name = os.path.dirname(file_path)
                            with tempfile.NamedTemporaryFile("w", delete=False, encoding="utf-8", dir=dir_name) as temp_file:
                                json.dump(data, temp_file, indent=4, ensure_ascii=False)
                                temp_file.flush()
                                os.fsync(temp_file.fileno())
                            
                            # Substitui o arquivo original pelo temporário de forma atômica
                            os.replace(temp_file.name, file_path)

                            # Log para exibir as alterações realizadas
                            updated_fields = []
                            for key in updates.keys():
                                if key in data:
                                    updated_fields.append(f"{key}: {updates[key]}")
                            changes = ", ".join(updated_fields)
                            print(f"[INFO] Atualizado {unique_id} ({changes}).")

                            found = True
                            break
                        except Exception as e:
                            print(f"[ERRO] Falha ao atualizar {file_path}: {e}")

            if not found:
                print(f"[ERRO] ID '{unique_id}' não encontrado na seção '{section}'.")

            sleep(0.250)  # Aguarda 0.250 segundo para evitar problemas de concorrência