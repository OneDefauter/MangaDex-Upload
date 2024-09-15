import re
import requests

class GetChapter():
    def __init__(self, login_core, config_core) -> None:
        self.login_core = login_core
        self.config_core = config_core
    
    def get_login(self):
        return self.login_core.load_data()
    
    def load_config(self):
        return self.config_core.load_config()
    
    def extract_group_ids(self, groups):
        group_ids = []
        for group in groups:
            match = re.search(r'\((.*?)\)', group)  # Expressão regular para pegar o que está entre parênteses
            if match:
                group_ids.append(match.group(1))  # Extrai apenas o ID
        return group_ids
    
    def get_chapter(self, chapter_id):
        config = self.load_config()

        r = requests.get(
            f"{config['api_url']}/chapter/{chapter_id}?includes%5B%5D=scanlation_group&includes%5B%5D=user"
        )
        
        if r.ok:
            return r.json()['data']
    
    def edit_chapter(self, chapter_id, data):
        config = self.load_config()
        login = self.get_login()
        
        access_token = self.login_core.refresh_access_token(refresh_token=login['refresh_token'], client_id=login['client_id'], client_secret=login['client_secret'])
        
        response = requests.put(
            f"{config['api_url']}/chapter/{chapter_id}",
            headers={
                "Authorization": f"Bearer {access_token}",
            },
            json={
                "title": data['title'],
                "volume": data['volume'],
                "chapter": data['chapter'],
                "groups": self.extract_group_ids(data['groups']),
                "version": data['version']
            }
        )
        
        if response.ok:
            return True
        
        return False
    
    def delete_chapter(self, chapter_id):
        config = self.load_config()
        login = self.get_login()
        
        access_token = self.login_core.refresh_access_token(refresh_token=login['refresh_token'], client_id=login['client_id'], client_secret=login['client_secret'])
        
        response = requests.delete(
            f"{config['api_url']}/chapter/{chapter_id}",
            headers={
                "Authorization": f"Bearer {access_token}"
            }
        )
        
        if response.ok:
            return True
        
        return False