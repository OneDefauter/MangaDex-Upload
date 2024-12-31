import requests
import concurrent.futures

from natsort import natsorted

class GetManga():
    def __init__(self, config_core, AUTHOR, COVER):
        self.config_core = config_core
        self.AUTHOR = AUTHOR
        self.COVER = COVER

    def sort_chapters(self, volumes):
        # Ordena volumes e capítulos usando natsort
        sorted_volumes = {}
        for volume, volume_data in natsorted(volumes.items()):
            sorted_chapters = dict(natsorted(volume_data['chapters'].items()))
            sorted_volumes[volume] = {'chapters': sorted_chapters}
        return sorted_volumes

    def load_config(self):
        return self.config_core.load_config()
    
    def get_manga(self, query, limit, offset):
        config = self.load_config()
        
        response = requests.get(
            f"{config['api_url']}/manga", 
            params={
                "title": query, 
                "limit": limit, 
                "offset": offset
            }
        )
        
        if response.status_code == 200:
            response_data = response.json()
            mangas = response_data.get('data', [])
            total_results = response_data.get('total', 0)
            
            results = []

            # Definir uma função para processar cada mangá
            def process_manga(manga):
                manga_id = manga['id']
                title = manga['attributes']['title'].get('en', 'Título não disponível')
                cover_id = next((rel['id'] for rel in manga['relationships'] if rel['type'] == 'cover_art'), None)

                if cover_id:
                    cover_url = self.COVER.get_cover(cover_id, manga_id)
                else:
                    cover_url = '/static/covers/placeholder.jpg'

                return {
                    'id': manga_id,
                    'title': title,
                    'cover_url': cover_url
                }

            with concurrent.futures.ThreadPoolExecutor(max_workers=config['upload']) as executor:
                future_to_manga = {executor.submit(process_manga, manga): manga for manga in mangas}

                for future in concurrent.futures.as_completed(future_to_manga):
                    try:
                        result = future.result()
                        results.append(result)
                    except Exception as e:
                        print(f"Ocorreu um erro ao processar um mangá: {e}")

            return {
                'results': results,
                'total': total_results
            }

        else:
            return {
                'results': [],
                'total': 0
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
                'title': manga_data['attributes']['title'].get('en', 'Título não disponível'),
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
                title = manga['attributes']['title'].get('en', next(iter(manga['attributes']['title'].values()), 'Título desconhecido'))
                
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

        return results

    def get_manga_id(self, manga_id):
        config = self.load_config()
        
        response = requests.get(
            f"{config['api_url']}/manga/{manga_id}"
        )
        
        if response.ok:
            return response.json()['data']
        
        return None
    
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