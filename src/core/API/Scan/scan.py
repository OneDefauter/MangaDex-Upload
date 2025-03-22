import requests

class GetScan:
    """
    Classe responsável por interagir com a API de grupos de scan, permitindo pesquisar grupos e obter detalhes específicos.

    Atributos:
        config_core (object): Objeto de configuração do sistema utilizado para carregar as configurações da API.
    """

    def __init__(self, config_core):
        """
        Inicializa a classe GetScan com o objeto de configuração.

        Args:
            config_core (object): Objeto de configuração para acessar as configurações da API.
        """
        self.config_core = config_core

    def load_config(self):
        """
        Carrega a configuração atual do sistema.

        Returns:
            dict: Dicionário contendo as configurações da API, incluindo a URL base.
        """
        return self.config_core.load_config()
    
    def search_scan(self, query, language=''):
        """
        Pesquisa grupos de scan com base no nome fornecido. O filtro por idioma é aplicado apenas após o recebimento dos resultados.

        Args:
            query (str): O nome do grupo de scan a ser pesquisado.
            language (str, opcional): Código do idioma (ex: 'pt-br', 'en') para filtrar os resultados. 
                                      Se não for fornecido, retornará resultados de todos os idiomas.

        Returns:
            list: Lista de dicionários contendo informações dos grupos encontrados, com os seguintes campos:
                - 'id' (str): ID do grupo.
                - 'name' (str): Nome do grupo.
                - 'lang' (list): Lista de idiomas em que o grupo está focado.
        
        Exemplo de retorno:
            [
                {"id": "123", "name": "Grupo A", "lang": ["pt-br", "en"]},
                {"id": "456", "name": "Grupo B", "lang": ["es"]}
            ]
        """
        config = self.load_config()

        # Faz a requisição sem filtrar pelo idioma na URL
        url = f"{config['api_url']}/group?name={query}"
        response = requests.get(url)

        results = []
        if response.ok:
            data = response.json()
            for group in data.get('data', []):
                group_langs = group['attributes'].get('focusedLanguages', [])

                # Filtra pelo idioma apenas no Python
                if not language or not group_langs or language in group_langs:
                    results.append({
                        'id': group['id'],
                        'name': group['attributes']['name'],
                        'lang': group_langs
                    })

        return results

    def get_scan(self, scan_id):
        """
        Obtém informações detalhadas de um grupo de scan específico com base no seu ID.

        Args:
            scan_id (str): O ID do grupo de scan a ser consultado.

        Returns:
            dict | None: Dicionário contendo os detalhes do grupo se a requisição for bem-sucedida, ou `None` em caso de falha.

        Exemplo de retorno:
            {
                "id": "123",
                "type": "group",
                "attributes": {
                    "name": "Grupo A",
                    "description": "Grupo focado em mangás shonen.",
                    "focusedLanguages": ["pt-br"]
                }
            }
        """
        config = self.load_config()
        
        response = requests.get(
            f"{config['api_url']}/group/{scan_id}"
        )
        
        if response.ok:
            return response.json()['data']
        
        return None