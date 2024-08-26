import requests

class GetScan():
    def __init__(self, config_core):
        self.config_core = config_core

    def load_config(self):
        return self.config_core.load_config()
    
    def search_scan(self, query):
        config = self.load_config()
        
        response = requests.get(
            f"{config['api_url']}/group?name={query}"
        )
        
        results = []
        if response.ok:
            data = response.json()
            results = [{'id': group['id'], 'name': group['attributes']['name'], 'lang': group['attributes']['focusedLanguages']} for group in data['data']]

        return results
    
    def get_scan(self, scan_id):
        config = self.load_config()
        
        response = requests.get(
            f"{config['api_url']}/group/{scan_id}"
        )
        
        if response.ok:
            return response.json()['data']
        
        return None