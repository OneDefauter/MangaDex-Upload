import time
import queue

class UploadQueue():
    def __init__(self) -> None:
        self.UPLOAD_QUEUE = queue.Queue()
        self.queue_upload = {}

    def upload(self):
        while True:
            try:
                upload_core = self.UPLOAD_QUEUE.get(timeout=10)
                if upload_core:
                    try:
                        queue_upload_key = f'{upload_core.manga_title} - {upload_core.language} - {upload_core.chapter}'
                    except:
                        queue_upload_key = None
                    if queue_upload_key:
                        try:
                            self.queue_upload[queue_upload_key]['status'] = 'Processando'
                        except KeyError:
                            pass  # Ignora se a chave não existir

                    try:
                        result = upload_core.setup()
                        if queue_upload_key:
                            try:
                                if result == 'success':
                                    self.queue_upload[queue_upload_key]['status'] = 'Concluído'
                                elif result == 'canceled':
                                    self.queue_upload[queue_upload_key]['status'] = 'Cancelado'
                                else:
                                    self.queue_upload[queue_upload_key]['status'] = 'Erro'
                            except KeyError:
                                pass  # Ignora se a chave não existir
                    except Exception as e:
                        try:
                            if queue_upload_key:
                                try:
                                    self.queue_upload[queue_upload_key]['status'] = 'Erro'
                                    self.queue_upload[queue_upload_key]['error'] = str(e)
                                except KeyError:
                                    pass  # Ignora se a chave não existir
                            print(f"Erro ao enviar capítulo {upload_core}: {e}")
                        except:
                            pass
                    self.UPLOAD_QUEUE.task_done()
            except queue.Empty:
                time.sleep(1)

    def add(self, core):
        self.UPLOAD_QUEUE.put(core)
    
    def get(self):
        return self.UPLOAD_QUEUE.queue
    
    def pop(self, item):
        self.queue_upload.pop(item, None)