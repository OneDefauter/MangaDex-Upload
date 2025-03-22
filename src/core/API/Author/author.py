import requests

class GetAuthor():
    def __init__(self, login_core, config_core):
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
    
    def get_author(self, author_id):
        config = self.load_config()
        
        person_response = requests.get(f"{config['api_url']}/author/{author_id}")
        if person_response.status_code == 200:
            return person_response.json()['data']['attributes']['name']
        return 'Desconhecido'

    def get_author_list(self, limit=100, offset=0, ids=None, name=None, order=None, includes=None):
        """
        Obtém uma lista de autores da API MangaDex de forma configurável.

        Args:
            limit (int, optional): Limite de resultados retornados. Padrão é 10 na API.
            offset (int, optional): Deslocamento (página) dos resultados. Padrão é 0.
            ids (list[str], optional): Lista de IDs específicos para filtrar (query param `ids[]`).
            name (str, optional): Nome do autor para busca (query param `name`).
            order (dict, optional): Objeto contendo campos e direções de ordenação (exemplo: {"name": "asc"}).
            includes (list[str], optional): Lista de strings que definem relacionamentos para incluir (query param `includes[]`).

        Returns:
            list[dict]: Lista de dicionários, cada um contendo as chaves:
                - 'id': (str) O ID do autor.
                - 'name': (str) O nome do autor.

            Retorna uma lista vazia se a requisição não for bem-sucedida ou se não houver dados.

        Example:
            >>> # Exemplo de uso:
            >>> authors = AUTHOR.get_author_list(
            ...     limit=5, 
            ...     name="yui", 
            ...     order={"name": "asc"}
            ... )
            >>> print(authors)
            [
                {"id": "d23c416b-cb36-4738-b014-cba78de57609", "name": "Agarizaki Yuiko"},
                {"id": "51b864b3-f245-45b4-8cb6-05f39fe84a45", "name": "Aizawa Yuito"},
                ...
            ]
        """
        config = self.load_config()
        
        url = f"{config['api_url']}/author"
        
        # Monta o dicionário de parâmetros
        params = {
            'limit': limit,
            'offset': offset
        }
        
        if ids:
            params['ids[]'] = ids
        
        if name:
            params['name'] = name
        
        if order:
            for key, value in order.items():
                params[f"order[{key}]"] = value
        
        if includes:
            params['includes[]'] = includes
        
        response = requests.get(url, params=params)
        
        if response.status_code == 200:
            data = response.json()
            authors = [
                {"id": author["id"], "name": author["attributes"]["name"]}
                for author in data.get("data", [])
            ]
            return authors
        
        return []

    def get_author_uuid(self, author_id):
        """
        Obtém o autor correspondente a um UUID específico na API MangaDex.

        Args:
            author_id (str): UUID do autor (por exemplo, 'd23c416b-cb36-4738-b014-cba78de57609').

        Returns:
            dict: Dicionário contendo as chaves:
                - 'id' (str): O UUID do autor.
                - 'name' (str): O nome do autor.
            
            Retorna um dicionário vazio se não for possível recuperar os dados.

        Example:
            >>> # Exemplo de uso:
            >>> author_data = AUTHOR.get_author_uuid("d23c416b-cb36-4738-b014-cba78de57609")
            >>> print(author_data)
            {"id": "d23c416b-cb36-4738-b014-cba78de57609", "name": "Agarizaki Yuiko"}
        """
        config = self.load_config()
        url = f"{config['api_url']}/author/{author_id}"
        response = requests.get(url)

        if response.status_code == 200:
            data = response.json()
            # Garante que a estrutura de dados esteja presente antes de acessar
            if "data" in data and "attributes" in data["data"]:
                return {
                    "id": data["data"]["id"],
                    "name": data["data"]["attributes"]["name"]
                }

        return {}
    
    def create_author(self, name):
        """
        Cria um novo autor na API.

        Esta função faz uma requisição POST para a API, enviando o nome do autor.
        Se a criação for bem-sucedida, retorna um dicionário contendo o ID e o nome do autor.
        Caso contrário, retorna None.

        Args:
            name (str): Nome do autor a ser criado.

        Returns:
            dict | None: Um dicionário contendo o ID e o nome do autor, se a requisição for bem-sucedida.
                        Retorna None se a criação falhar.
        """
        self.access_token = self.get_access_token()
        if self.access_token:
            config = self.load_config()
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/json'
            }
            data = {'name': name}

            response = requests.post(f"{config['api_url']}/author", headers=headers, json=data)

            if response.ok:
                return {
                    'id': response.json()['data']['id'],
                    'name': response.json()['data']['attributes']['name']
                }
        
        return None
