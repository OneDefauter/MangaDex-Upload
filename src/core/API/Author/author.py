import requests

class GetAuthor():
    def __init__(self, config_core):
        self.config_core = config_core

    def load_config(self):
        return self.config_core.load_config()
    
    def get_author(self, author_id):
        config = self.load_config()
        
        person_response = requests.get(f"{config['api_url']}/author/{author_id}")
        if person_response.status_code == 200:
            return person_response.json()['data']['attributes']['name']
        return 'Desconhecido'