import requests

class UserMe():
    def __init__(self, login_core, config_core) -> None:
        self.login_core = login_core
        self.config_core = config_core
        self.user = None
    
    def get_login(self):
        return self.login_core.load_data()
    
    def load_config(self):
        return self.config_core.load_config()
    
    def get_user_me(self):
        data = self.get_login()
        config = self.load_config()
        
        if data is None:
            return None
        
        access_token = self.login_core.refresh_access_token(refresh_token=data['refresh_token'], client_id=data['client_id'], client_secret=data['client_secret'])

        if access_token == 400:
            return None

        if data:
            r = requests.get(
                f"{config['api_url']}/user/me",
                headers={
                    "Authorization": f"Bearer {access_token}"
                }
            )
            
            if r.ok:
                self.user = r.json()['data']
                return self.user