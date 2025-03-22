import queue
from time import sleep

class DownloadQueue():
    def __init__(self, socket, QUEUE_CORE) -> None:
        self.DOWNLOAD_QUEUE = queue.Queue()
        self.queue_download = {}
        self.SOCKET = socket
        self.QUEUE_CORE = QUEUE_CORE
        self.CURRENT_QUEUE = None
        self.PRIORITY_LIST = []

    def download(self):
        while True:
            try:
                self.load_queue_downloads()
                download_core = self.get_prioritized_item()
                if download_core:
                    queue_download_id = self.QUEUE_CORE.get_by_id(download_core.id)
                    if queue_download_id:
                        self.CURRENT_QUEUE = download_core
                        self.QUEUE_CORE.update_field(
                            unique_id=download_core.id,
                            section="downloads",
                            updates={
                                "status": {
                                    'type': "Processando",
                                    'value': 4
                                }
                            }
                        )

                        self.SOCKET.emit('check_queue_data')

                        result = download_core.download_chapter()

                        """
                        Resultados possíveis
                        1 = Sucesso
                        2 = Erro
                        3 = Cancelado
                        """

                        if result['st'] == 1:
                            self.QUEUE_CORE.update_field(
                                unique_id=download_core.id,
                                section="downloads",
                                updates={
                                    "status": {
                                        'type': "Concluído",
                                        'value': 1
                                    }
                                }
                            )

                        elif result['st'] == 2:
                            self.QUEUE_CORE.update_field(
                                unique_id=download_core.id,
                                section="downloads",
                                updates={
                                    "status": {
                                        'type': "Erro",
                                        'value': 2,
                                        'error': result['e']
                                    }
                                }
                            )

                        elif result['st'] == 3:
                            # Obtém o status atual do upload
                            current_status = self.QUEUE_CORE.get_by_id(download_core.id).get('status', {}).get('value')

                            # Verifica se o status já não está como "Cancelado"
                            if current_status != 3:
                                self.QUEUE_CORE.update_field(
                                    unique_id=download_core.id,
                                    section="downloads",
                                    updates={
                                        "status": {
                                            'type': "Cancelado",
                                            'value': 3,
                                            'detail': result['d']
                                        }
                                    }
                                )

                        self.SOCKET.emit('check_queue_data')
                        self.DOWNLOAD_QUEUE.task_done()
                        self.CURRENT_QUEUE = None
                        sleep(0.5)
            except:
                sleep(1)

    def add(self, core):
        self.DOWNLOAD_QUEUE.put(core)

    def get(self):
        fila = list(self.DOWNLOAD_QUEUE.queue)
        if self.CURRENT_QUEUE:
            fila.insert(0, self.CURRENT_QUEUE)  # Adiciona o upload atual no início da fila
        return fila

    def prioritize(self, download_id):
        """Adiciona um ID à lista de prioridade"""
        if download_id not in self.PRIORITY_LIST:
            self.PRIORITY_LIST.append(download_id)

    def get_prioritized_item(self):
        """Obtém um item da fila, priorizando os IDs marcados como prioritários."""
        temp_list = []  # Lista temporária para manter a ordem correta

        prioritized_item = None

        # Percorre a fila e verifica se há um item prioritário
        while not self.DOWNLOAD_QUEUE.empty():
            item = self.DOWNLOAD_QUEUE.get()
            if item.id in self.PRIORITY_LIST:
                prioritized_item = item  # Achou um item prioritário!
                self.PRIORITY_LIST.remove(item.id)  # Remove da lista de prioridades
                break
            temp_list.append(item)  # Guarda os outros itens

        # Reinsere os itens na fila na mesma ordem
        for item in temp_list:
            self.DOWNLOAD_QUEUE.put(item)

        # Se nenhum item prioritário foi encontrado, retorna normalmente da fila
        if not prioritized_item:
            try:
                return self.DOWNLOAD_QUEUE.get(timeout=10)
            except queue.Empty:
                sleep(1)
                return None

        return prioritized_item

    def load_queue_downloads(self):
        """
        Carrega os downloads pendentes da `QUEUE_CORE` e adiciona na fila de processamento.
        """
        data = self.QUEUE_CORE.load()  # Obtém os downloads armazenados
        self.queue_upload = data.get("downloads", {})