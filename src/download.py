import os
import requests
import concurrent.futures

class DownloadChapters():
    def __init__(self, manga_title, translated, chapter, chapter_id, path, queue, api_url) -> None:
        self.manga_title = manga_title
        self.translated = translated
        self.chapter = chapter
        self.chapter_id = chapter_id
        self.path = path
        self.queue = queue
        self.api_url = api_url
    
    def get_pages(self):
        r = requests.get(
            f"{self.api_url}/at-home/server/{self.chapter_id}"
        )
        
        if r.ok:
            return r.json()
        
        else:
            return None
    
    def download_image(self, url, path):
        response = requests.get(url, stream=True)
        if response.ok:
            with open(path, 'wb') as f:
                f.write(response.content)
            return True
        return False
    
    def download_chapter(self, use_data_saver=False):
        self.pages = self.get_pages()
        if not self.pages:
            return 404
            
        base_url = self.pages['baseUrl']
        chapter_data = self.pages['chapter']
        hash = chapter_data['hash']
        data_type = 'dataSaver' if use_data_saver else 'data'
        images = chapter_data[data_type]
        
        os.makedirs(self.path, exist_ok=True)
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.queue) as executor:
            futures = []
            for idx, image in enumerate(images, start=1):
                # Define o caminho do arquivo da imagem
                image_path = os.path.join(self.path, f"{idx:03}.jpg")

                # Verifica se a imagem já existe
                if not os.path.exists(image_path):
                    url = f"{base_url}/{data_type}/{hash}/{image}"
                    # Submete o download da imagem se ela ainda não existir
                    futures.append(executor.submit(self.download_image, url, image_path))
            
            for future in concurrent.futures.as_completed(futures):
                if not future.result():
                    print("Falha ao baixar uma imagem.")
