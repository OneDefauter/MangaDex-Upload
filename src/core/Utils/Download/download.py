import time
import queue

class DownloadQueue():
    def __init__(self) -> None:
        self.download_QUEUE = queue.Queue()
        self.queue_download = {}

    def download(self):
        while True:
            try:
                download_core = self.download_QUEUE.get(timeout=10)  # Timeout de 10 segundos
                if download_core:
                    key = f'{download_core.manga_title} - {download_core.translated} - {download_core.chapter}'
                    
                    # Tentar atualizar o status, ignorando KeyError se a chave não existir
                    try:
                        self.queue_download[key]['status'] = 'Processando'
                    except KeyError:
                        pass  # Ignora se a chave não existir

                    try:
                        download_core.download_chapter()
                        try:
                            self.queue_download[key]['status'] = 'Concluído'
                        except KeyError:
                            pass  # Ignora se a chave não existir
                    except Exception as e:
                        try:
                            self.queue_download[key]['status'] = 'Erro'
                            self.queue_download[key]['error'] = str(e)
                        except KeyError:
                            pass  # Ignora se a chave não existir
                        print(f"Erro ao baixar capítulo {download_core}: {e}")
                    self.download_QUEUE.task_done()
            except queue.Empty:
                time.sleep(1)

    def add(self, core):
        self.download_QUEUE.put(core)
    
    def get(self):
        return self.download_QUEUE.queue
    
    def pop(self, item):
        self.queue_download.pop(item, None)