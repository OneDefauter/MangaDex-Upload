import os
import requests
from PIL import Image
from io import BytesIO

class GetCover:
    """
    Classe responsável por gerenciar o download e o armazenamento local de capas de mangás.

    Métodos:
        - ensure_cover_directory(): Garante que o diretório para armazenar as capas existe.
        - get_cover(cover_id, manga_id, config): Obtém a capa do mangá, fazendo o download da API se necessário.
    """

    def __init__(self, login_core, config_core):
        """
        Inicializa a classe GetCover.
        """
        self.login = login_core
        self.config_core = config_core

    def load_config(self):
        return self.config_core.load_config()

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

    def ensure_cover_directory(self):
        """
        Garante que o diretório para armazenar as capas existe.

        Cria o diretório `static/covers` se ele ainda não existir.

        Returns:
            str: O caminho do diretório onde as capas são armazenadas.
        """
        cover_dir = os.path.join('static', 'covers')
        if not os.path.exists(cover_dir):
            os.makedirs(cover_dir)
        return cover_dir

    def get_cover(self, cover_id, manga_id, config):
        """
        Obtém a capa de um mangá com base no `cover_id` e `manga_id`.

        O método verifica se a capa já existe localmente:
            - Se existir, retorna o caminho da imagem local.
            - Se não existir, faz uma requisição à API, baixa a imagem e salva localmente.

        A qualidade da imagem é determinada pela configuração `cover_image_quality`:
            - "original": Imagem em alta resolução.
            - "reduced": Imagem reduzida para 512px de largura.
            - "highly_reduced": Imagem altamente reduzida para 256px de largura.

        Args:
            cover_id (str): O ID da capa no sistema da API.
            manga_id (str): O ID do mangá ao qual a capa pertence.
            config (dict): Configurações do sistema, incluindo:
                - 'api_url': URL da API para buscar as capas.
                - 'cover_image_quality': Qualidade da imagem desejada ('original', 'reduced', 'highly_reduced').

        Returns:
            str: O caminho relativo para a capa armazenada localmente ou o caminho da imagem de placeholder em caso de erro.

        Exemplo de resposta da API:
        {
            "result": "ok",
            "response": "entity",
            "data": {
                "id": "a348ce66-f40b-482a-a292-5f463acedde7",
                "type": "cover_art",
                "attributes": {
                    "description": "",
                    "volume": null,
                    "fileName": "4aca0fbb-dd00-4c8d-9f90-6203399f8f8b.jpg",
                    "locale": "ko",
                    "createdAt": "2022-03-02T09:40:12+00:00",
                    "updatedAt": "2022-08-29T17:02:00+00:00",
                    "version": 2
                },
                "relationships": [
                    {
                        "id": "50679d77-957f-4b62-8a01-e621095b7ca2",
                        "type": "manga"
                    },
                    {
                        "id": "3678de43-a55d-43be-b2ab-5c32a8219021",
                        "type": "user"
                    }
                ]
            }
        }
        """
        cover_dir = self.ensure_cover_directory()
        local_cover_path = os.path.join(cover_dir, f"{manga_id}.jpg")

        # Verifica se a imagem já existe localmente
        if os.path.exists(local_cover_path):
            return f"/static/covers/{manga_id}.jpg"

        # Busca os dados da capa na API
        cover_response = requests.get(f"{config['api_url']}/cover/{cover_id}")
        if cover_response.status_code == 200:
            cover_data = cover_response.json().get('data', {})
            file_name = cover_data['attributes'].get('fileName', '')

            # Determina a qualidade da imagem
            if config['cover_image_quality'] == 'original':
                cover_url = f"https://uploads.mangadex.org/covers/{manga_id}/{file_name}"

            elif config['cover_image_quality'] == 'reduced':
                cover_url = f"https://uploads.mangadex.org/covers/{manga_id}/{file_name}.512.jpg"

            elif config['cover_image_quality'] == 'highly_reduced':
                cover_url = f"https://uploads.mangadex.org/covers/{manga_id}/{file_name}.256.jpg"

            else:
                cover_url = f"https://uploads.mangadex.org/covers/{manga_id}/{file_name}.256.jpg"

            # Faz o download e salva a imagem localmente
            try:
                img_data = requests.get(cover_url).content
                with open(local_cover_path, 'wb') as img_file:
                    img_file.write(img_data)

            except Exception as e:
                print(f"Erro ao baixar ou salvar a capa: {e}")
                return '/static/covers/placeholder.jpg'

            # Retorna o caminho local da imagem
            return f"/static/covers/{manga_id}.jpg"

        else:
            # Retorna a imagem de placeholder em caso de erro
            return '/static/covers/placeholder.jpg'
    
    def resize_image(self, file):
        """
        Redimensiona a imagem para atender aos requisitos mínimos da API (150x225).
        Retorna (objeto_bytesIO, mime_type, filename).
        """
        # Se 'file' for um FileStorage (Flask), ele terá 'filename' e 'stream'.
        # Se for um _io.BufferedReader, terá 'name' (o caminho do arquivo).
        import os
        from io import BytesIO
        from PIL import Image

        if hasattr(file, 'filename'):  
            # É um FileStorage
            filename = file.filename
            stream = file.stream
        else:
            # Provavelmente é um arquivo aberto (_io.BufferedReader)
            # Pega o caminho completo em file.name e extrai só o nome
            filename = os.path.basename(file.name)
            stream = file  # O próprio arquivo aberto

        # Abre a imagem via Pillow
        image = Image.open(stream)

        # Determina qual formato a imagem realmente tem (ex: 'JPEG', 'PNG', etc.)
        original_format = image.format  
        # Se não for reconhecido ou se você quiser forçar:
        if original_format not in ("JPEG", "PNG"):
            original_format = "JPEG"

        # Define MIME type
        pillow_to_mime = {
            "JPEG": "image/jpeg",
            "PNG": "image/png"
        }
        mime_type = pillow_to_mime[original_format]

        # Requisitos mínimos
        min_width, min_height = 150, 225
        width, height = image.size

        # Redimensiona se necessário
        if width < min_width or height < min_height:
            new_width = max(width, min_width)
            new_height = max(height, min_height)
            image = image.resize((new_width, new_height), Image.LANCZOS)

        # Salva num BytesIO
        buffer = BytesIO()
        image.save(buffer, format=original_format)
        buffer.seek(0)

        # Ajusta a extensão do nome do arquivo para corresponder ao formato
        if original_format == "JPEG":
            ext = ".jpg"
        else:
            ext = ".png"

        # Se o 'filename' original tiver extensão errada, sobrescrevemos:
        base, _ = os.path.splitext(filename)
        filename = base + ext

        return buffer, mime_type, filename

    def upload_cover(self, file, volume, description, locale, workId):
        """
        Envia a capa usando a API, garantindo que ela tenha o tamanho mínimo necessário.
        """
        self.access_token = self.get_access_token()
        if not self.access_token:
            return False

        config = self.load_config()
        headers = {
            "Authorization": f"Bearer {self.access_token}"
        }

        # Redimensiona a imagem se necessário
        resized_image, mime_type, filename = self.resize_image(file)

        # Cria payload para envio
        # 'filename' é o que aparecerá como nome do arquivo na requisição,
        # 'resized_image' é um BytesIO posicionado em 0,
        # 'mime_type' é o tipo MIME correspondente (ex: "image/jpeg")
        files = {
            "file": (filename, resized_image, mime_type)
        }
        data = {
            "volume": volume,
            "description": description,
            "locale": locale
        }

        response = requests.post(
            f"{config['api_url']}/cover/{workId}",
            headers=headers,
            files=files,
            data=data
        )

        if response.ok:
            return response.json()
        else:
            return {"error": f"Erro ao enviar capa: {response.status_code}", 
                    "details": response.text}
