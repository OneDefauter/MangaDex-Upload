import os
import requests

class GetCover():
    def __init__(self, config_core):
        self.config_core = config_core

    def ensure_cover_directory(self):
        cover_dir = os.path.join('static', 'covers')
        if not os.path.exists(cover_dir):
            os.makedirs(cover_dir)
        return cover_dir

    def load_config(self):
        return self.config_core.load_config()
    
    def get_cover(self, cover_id, manga_id):
        config = self.load_config()
        
        cover_dir = self.ensure_cover_directory()
        
        cover_response = requests.get(f"{config['api_url']}/cover/{cover_id}")
        if cover_response.status_code == 200:
            cover_data = cover_response.json().get('data', {})
            file_name = cover_data['attributes'].get('fileName', '')
            if config['cover_image_quality'] == 'original':
                cover_url = f"https://uploads.mangadex.org/covers/{manga_id}/{file_name}"
            elif config['cover_image_quality'] == 'original':
                cover_url = f"https://uploads.mangadex.org/covers/{manga_id}/{file_name}.512.jpg"
            elif config['cover_image_quality'] == 'original':
                cover_url = f"https://uploads.mangadex.org/covers/{manga_id}/{file_name}.256.jpg"
            else:
                cover_url = f"https://uploads.mangadex.org/covers/{manga_id}/{file_name}.256.jpg"
            
            local_cover_path = os.path.join(cover_dir, f"{manga_id}.jpg")

            if not os.path.exists(local_cover_path):
                img_data = requests.get(cover_url).content
                with open(local_cover_path, 'wb') as img_file:
                    img_file.write(img_data)

            cover_url = f"/static/covers/{manga_id}.jpg"
            return cover_url
        else:
            cover_url = '/static/covers/placeholder.jpg'
            return cover_url