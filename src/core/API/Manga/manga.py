import requests
import concurrent.futures

from natsort import natsorted

class GetManga():
    def __init__(self, login_core, config_core, AUTHOR, COVER, SOCKET):
        self.login = login_core
        self.config_core = config_core
        self.AUTHOR = AUTHOR
        self.COVER = COVER
        self.SOCKET = SOCKET

    def sort_chapters(self, volumes):
        # Ordena volumes e capítulos usando natsort
        sorted_volumes = {}
        for volume, volume_data in natsorted(volumes.items()):
            sorted_chapters = dict(natsorted(volume_data['chapters'].items()))
            sorted_volumes[volume] = {'chapters': sorted_chapters}
        return sorted_volumes

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

    def get_manga(self, query, limit, offset=0, mu=False):
        config = self.load_config()
        max_api_limit = 100  # Limite máximo permitido pela API
        mangas = []
        total_results = 0

        progress_data = {
            'percentage': 0,
            'completed': 0,
            'total': 0
        }
        
        if mu:
            content_rating = ['safe', 'suggestive', 'erotica', 'pornographic']
        else:
            content_rating = config["search_filter"]["contentRating"]

        # Etapa 1: Obter todos os dados dos mangás
        while limit > 0:
            current_limit = min(limit, max_api_limit)  # Lote atual (máximo 100)
            
            # Configuração dos parâmetros
            params = {
                "title": query,  # Parâmetro 'title'
                "limit": current_limit,  # Limite de resultados
                "offset": offset,  # Deslocamento
                "contentRating[]": content_rating,  # Classificação de conteúdo
            }

            # Adicionar os campos de ordenação se estiverem ativados
            for key, order_config in config["search_filter"]["order"].items():
                if order_config["enable"]:  # Apenas campos com `enable: True`
                    params[f"order[{key}]"] = order_config["type"]
                
            response = requests.get(
                f"{config['api_url']}/manga",
                params=params
            )

            if response.status_code == 200:
                response_data = response.json()
                fetched_mangas = response_data.get('data', [])
                total_results = response_data.get('total', 0)

                mangas.extend(fetched_mangas)  # Adiciona os mangás ao conjunto geral

                # Atualiza o `offset` e decrementa o `limit`
                offset += current_limit
                limit -= current_limit

                # Se não houver mais mangás disponíveis, pare
                if len(fetched_mangas) < current_limit:
                    break
            else:
                print(f"Erro na requisição: {response.status_code}")
                break

        # Etapa 2: Processar os dados para incluir as capas
        results = []

        def process_manga_cover(manga):
            manga_id = manga['id']
            title = manga.get('attributes', {}).get('title', {}).get('en') or next(
                iter(manga.get('attributes', {}).get('title', {}).values()), 'Título não encontrado'
            )
            cover_id = next((rel['id'] for rel in manga['relationships'] if rel['type'] == 'cover_art'), None)

            if cover_id:
                cover_url = self.COVER.get_cover(cover_id, manga_id, config)
            else:
                cover_url = '/static/covers/placeholder.jpg'

            return {
                'id': manga_id,
                'title': title,
                'cover_url': cover_url,
                'data': {'attributes': manga['attributes'], 'relationships': manga['relationships']}
            }

        progress_data['total'] = len(mangas)

        # Usar ThreadPoolExecutor para baixar as capas em paralelo
        with concurrent.futures.ThreadPoolExecutor(max_workers=config['upload']) as executor:
            future_to_manga = {executor.submit(process_manga_cover, manga): manga for manga in mangas}

            for future in concurrent.futures.as_completed(future_to_manga):
                try:
                    result = future.result()
                    results.append(result)
                    
                    progress_data['completed'] += 1
                    progress_data['percentage'] = int((progress_data['completed'] / progress_data['total']) * 100)

                    self.SOCKET.emit('progress_update_search', progress_data)
                    self.SOCKET.emit('get_folder_size')
                except Exception as e:
                    print(f"Ocorreu um erro ao processar uma capa: {e}")

        return {
            'results': results,
            'total': total_results
        }

    def get_manga_details(self, manga_id):
        config = self.load_config()
        
        manga_response = requests.get(f"{config['api_url']}/manga/{manga_id}")
        if manga_response.status_code == 200:
            manga_data = manga_response.json()['data']
            
            # Caminho para a capa local salva
            local_cover_path = f"/static/covers/{manga_id}.jpg"
            
            # Obter a descrição em português, ou usar inglês como fallback
            description = manga_data['attributes']['description'].get('pt-br') or \
                        manga_data['attributes']['description'].get('en', 'Sem descrição disponível')
            
            # Obter nome do autor
            author_id = next((rel['id'] for rel in manga_data['relationships'] if rel['type'] == 'author'), None)
            author_name = self.AUTHOR.get_author(author_id) if author_id else 'Desconhecido'
            
            # Obter nome do artista
            artist_id = next((rel['id'] for rel in manga_data['relationships'] if rel['type'] == 'artist'), None)
            artist_name = self.AUTHOR.get_author(artist_id) if artist_id else 'Desconhecido'
            
            manga_details = {
                'title': manga_data.get('attributes', {}).get('title', {}).get('en') or next(iter(manga_data.get('attributes', {}).get('title', {}).values()), 'Título não encontrado'),
                'cover_url': local_cover_path,  # Usa a capa local
                'author': author_name,
                'artist': artist_name,
                'status': manga_data['attributes']['status'],
                'link': f"https://mangadex.org/title/{manga_id}",
                'description': description,
                'tags': [tag['attributes']['name']['en'] for tag in manga_data['attributes']['tags']],
                'availableTranslatedLanguages': manga_data['attributes']['availableTranslatedLanguages']
            }
            
            return True, manga_details
        return False, None

    def search_manga(self, query):
        config = self.load_config()
        content_rating = ['safe', 'suggestive', 'erotica', 'pornographic']

        # Parâmetros da consulta
        params = {'title': query, 'contentRating[]': content_rating}

        # Faz a requisição à API
        response = requests.get(f"{config['api_url']}/manga", params=params)

        results = []
        if response.ok:
            data = response.json()
            for manga in data['data']:
                # Verificar se há título em inglês, senão pegar o primeiro alternativo disponível
                title = manga.get('attributes', {}).get('title', {}).get('en') or next(iter(manga.get('attributes', {}).get('title', {}).values()), 'Título não encontrado')
                
                # Verificar se a tag "Long Strip" está presente
                has_long_strip = any(
                    tag['attributes']['name']['en'] == 'Long Strip'
                    for tag in manga['attributes']['tags']
                )
                
                # Adicionar o ID, título e o status "Long Strip" aos resultados
                results.append({
                    'id': manga['id'],
                    'title': title,
                    'long_strip': has_long_strip  # Incluir a informação no resultado
                })

        else:
            if response.status_code == 503:
                self.SOCKET.emit('notification_message', {'message': 'MangaDex API indisponível'})

        return results

    def get_manga_id(self, manga_id):
        config = self.load_config()
        
        response = requests.get(
            f"{config['api_url']}/manga/{manga_id}"
        )
        
        if response.ok:
            return response.json()['data']
        
        if response.status_code == 503:
            self.SOCKET.emit('notification_message', {'message': 'MangaDex API indisponível'})
        elif response.status_code == 404:
            self.SOCKET.emit('notification_message', {'message': 'UUID do mangá inválido!'})

        return None

    def get_manga_uuid(self, manga_uuid):
        manga = self.get_manga_id(manga_uuid)

        if manga:
            # Verificar se há título em inglês, senão pegar o primeiro alternativo disponível
            title = manga.get('attributes', {}).get('title', {}).get('en') or next(iter(manga.get('attributes', {}).get('title', {}).values()), 'Título não encontrado')

            # Verificar se a tag "Long Strip" está presente
            has_long_strip = any(
                tag['attributes']['name']['en'] == 'Long Strip'
                for tag in manga['attributes']['tags']
            )

            return {
                "id": manga['id'],
                "title": title,
                "long_strip": has_long_strip
            }

        return None

    def search_manga_candidates(self, title, associated):
        """
        Realiza buscas na API do MangaDex utilizando o título principal e os títulos associados.
        Retorna uma lista de obras únicas (com suas capas baixadas automaticamente) para exibição.
        """
        # Cria uma lista de queries com o título principal e os associados (evitando duplicatas)
        queries = set()
        if title:
            queries.add(title)
        for assoc in associated:
            assoc_title = assoc.get("title")
            if assoc_title:
                queries.add(assoc_title)
        queries = list(queries)

        # Armazena os resultados obtidos
        all_results = []

        # Para cada query, utiliza o método search_manga já existente (que baixa as capas em paralelo)
        for query in queries:
            # Aqui assumimos que search_manga retorna um dicionário com 'results'
            results_data = self.get_manga(query, 50, mu=True)
            if results_data and 'results' in results_data:
                all_results.extend(results_data['results'])
        
        # Remove duplicatas com base no ID do mangá
        unique_results = {}
        for manga in all_results:
            unique_results[manga['id']] = manga

        return list(unique_results.values())

    def manga_aggregate(self, manga_id, language = None):
        config = self.load_config()
        
        if language:
            response = requests.get(
                f"{config['api_url']}/manga/{manga_id}/aggregate?translatedLanguage[]={language}"
            )
        else:
            response = requests.get(
                f"{config['api_url']}/manga/{manga_id}/aggregate"
            )
        
        if response.status_code == 200:
            data = response.json()['volumes']
            sorted_chapters = self.sort_chapters(data)
            return True, sorted_chapters
        return False, None
    
    def manga_aggregate_uploaded(self, manga_id, user_id, language=None):
        config = self.load_config()
        
        params = {
            'limit': 100,
            'uploader': user_id,
            'manga': manga_id,
            'contentRating[]': ['safe', 'suggestive', 'erotica', 'pornographic'],
            'order[volume]': 'asc',
            'order[chapter]': 'asc',
            'includes[]': ['scanlation_group'],
        }
        
        if language:
            params['translatedLanguage[]'] = language

        all_chapters = []
        offset = 0
        total_chapters = None
        
        while True:
            # Adiciona o offset aos parâmetros
            params['offset'] = offset
            
            response = requests.get(f"{config['api_url']}/chapter", params=params)
            
            if response.status_code == 200:
                response_data = response.json()
                chapters = response_data.get('data', [])
                total_chapters = response_data.get('total', 0)
                
                all_chapters.extend(chapters)
                
                # Incrementa o offset para a próxima página
                offset += len(chapters)
                
                # Se já obteve todos os capítulos, quebra o loop
                if offset >= total_chapters:
                    break
            else:
                # Se houver um erro na resposta, retorna False
                return False, None
        
        # Agora você pode retornar all_chapters diretamente
        return True, all_chapters

    def create_draft(self, data):
        self.access_token = self.get_access_token()
        if not self.access_token:
            return False
        
        config = self.load_config()
        
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
        
        response = requests.post(
            f"{config['api_url']}/manga",
            headers=headers,
            json=data
        )
        
        if response.ok:
            return response.json()['data']['id']
    
    def update_draft(self, manga_id, data):
        self.access_token = self.get_access_token()
        if not self.access_token:
            return False
        
        config = self.load_config()
        
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
        
        response = requests.patch(
            f"{config['api_url']}/manga/{manga_id}",
            headers=headers,
            json=data
        )
        
        return response.ok
    
    def send_draft(self, manga_id):
        self.access_token = self.get_access_token()
        if not self.access_token:
            return False
        
        config = self.load_config()
        
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
        
        data = {
            'version': 1
        }
        
        response = requests.post(
            f"{config['api_url']}/manga/draft/{manga_id}/commit",
            headers=headers,
            json=data
        )
        
        if response.ok:
            return response.json()['data']
        return False
    
    def get_draft(self):
        self.access_token = self.get_access_token()
        if not self.access_token:
            return False
        
        config = self.load_config()
        
        headers = {
            'Authorization': f'Bearer {self.access_token}'
        }
        
        response = requests.get(
            f"{config['api_url']}/manga/draft",
            headers=headers
        )
        
        if response.ok:
            return response.json()['data']