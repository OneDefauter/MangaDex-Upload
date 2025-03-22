import os
import shutil
import requests
import concurrent.futures

from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

class DownloadChapters():
    def __init__(self, id, data, socket, config, login) -> None:
        self.id = id
        self.socket = socket
        self.config_core = config
        self.login = login
        
        # Data
        ## Project
        self.manga_title = data['project']['manga_title']
        
        ## Chapter
        self.chapter_id = data['chapter']['id']
        self.language = data['chapter']['language']
        self.groups = data['chapter']['groups']
        self.volume = data['chapter']['volume']
        self.chapter = data['chapter']['chapter']
        
        ### Path
        self.path = data['chapter']['path']
        
        ## Status
        self.status = data['status']['value']
        
        ## Pre-Notif
        self.pre_notif = data['pre_notif']
        
        self.progress_data = {
            'percentage': 0,
            'completed': 0,
            'total': 0,
            'pages': {}
        }

    def status_cancel(self):
        self.status = 2

    def load_config(self):
        return self.config_core.load_config()

    def get_pages(self):
        r = requests.get(
            f"{self.config['api_url']}/at-home/server/{self.chapter_id}"
        )
        
        if r.ok:
            self.progress_data['total'] = len(r.json()['chapter']['data'])
            return r.json()
        else:
            return None
    
    def download_image(self, url, path):
        if self.status == 2:  # Verifica se o download foi cancelado
            return False
        
        session = requests.Session()
        retries = Retry(total=5, backoff_factor=1, status_forcelist=[500, 502, 503, 504])
        adapter = HTTPAdapter(max_retries=retries)
        session.mount('http://', adapter)
        session.mount('https://', adapter)
        
        try:
            response = session.get(url, stream=True, timeout=60)
        except requests.exceptions.RequestException:
            print()
        
        except:
            pass

        response = requests.get(url, stream=True)
        if response.ok:
            with open(path, 'wb') as f:
                f.write(response.content)
            self.progress_data['completed'] += 1
            self.progress_data['percentage'] = int((self.progress_data['completed'] / self.progress_data['total']) * 100)
            self.socket.emit('send_progress_update', data={"key": self.id, "progress": self.progress_data})
            return True
        return False

    def download_chapter(self, use_data_saver=False):
        self.config = self.load_config()
        self.pre_notif['status'] = 3
        self.socket.emit('notification_download', self.pre_notif)

        self.pages = self.get_pages()
        if not self.pages:
            self.pre_notif['status'] = 1
            self.pre_notif['error'] = "Erro ao obter as páginas do capítulo"
            self.socket.emit('notification_download', self.pre_notif)
            return {'st': 3, 'e': None, 'd': 'Nenhuma imagem encontrada'}

        base_url = self.pages['baseUrl']
        chapter_data = self.pages['chapter']
        hash = chapter_data['hash']
        data_type = 'dataSaver' if use_data_saver else 'data'
        images = chapter_data[data_type]

        os.makedirs(self.path, exist_ok=True)

        with concurrent.futures.ThreadPoolExecutor(max_workers=self.config['upload']) as executor:
            futures = []
            for idx, image in enumerate(images, start=1):
                if self.status == 2:  # Verifica se o download foi cancelado
                    self.pre_notif['status'] = 2
                    self.pre_notif['details'] = "Download cancelado"
                    self.socket.emit('notification_download', self.pre_notif)

                    shutil.rmtree(self.path)
                    print("Download cancelado.")
                    return {'st': 3, 'e': None, 'd': 'Cancelado pelo usuário'}

                # Define o caminho do arquivo da imagem
                image_path = os.path.join(self.path, f"{idx:03}.jpg")

                # Verifica se a imagem já existe
                if not os.path.exists(image_path):
                    url = f"{base_url}/{data_type}/{hash}/{image}"
                    # Submete o download da imagem se ela ainda não existir
                    futures.append(executor.submit(self.download_image, url, image_path))

            for future in concurrent.futures.as_completed(futures):
                if self.status == 2:  # Verifica se o download foi cancelado
                    self.pre_notif['status'] = 2
                    self.pre_notif['details'] = "Download cancelado"
                    self.socket.emit('notification_download', self.pre_notif)

                    print("Download cancelado durante a execução.")
                    executor.shutdown(wait=False)
                    return {'st': 3, 'e': None, 'd': 'Cancelado pelo usuário'}

                if not future.result():
                    self.pre_notif['status'] = 1
                    self.pre_notif['error'] = "Erro ao baixar uma imagem"
                    self.socket.emit('notification_download', self.pre_notif)
                    
                    print("Falha ao baixar uma imagem.")

        self.pre_notif['status'] = 0
        self.socket.emit('notification_download', self.pre_notif)
        return {'st': 1, 'e': None, 'd': None}