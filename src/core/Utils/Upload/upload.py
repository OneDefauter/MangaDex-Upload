import queue
import threading
from time import sleep

class UploadQueue():
    def __init__(self, socket, QUEUE_CORE) -> None:
        self.UPLOAD_QUEUE = queue.Queue()
        self.SOCKET = socket
        self.QUEUE_CORE = QUEUE_CORE
        self.CURRENT_QUEUE = None
        self.PRIORITY_LIST = []
        self.lock = threading.Lock()

    def upload(self):
        """
        Processa a fila de uploads de capítulos de mangás.

        Este método executa um loop infinito para monitorar a fila `UPLOAD_QUEUE`, 
        processando cada item da fila de maneira sequencial.

        Fluxo de execução:
        -------------------
        1. Obtém um item da fila `UPLOAD_QUEUE` com um tempo limite de 10 segundos.
        2. Verifica se o item existe na `QUEUE_CORE` antes de processá-lo.
        3. Atualiza o status do upload para "Processando" (`value = 4`).
        4. Emite um evento via `SOCKET` para atualizar a interface do usuário (`check_queue_data`).
        5. Chama `setup()` no objeto `upload_core` para executar o processo de upload.
        6. Com base no resultado (`result['st']`):
            - `1`: Upload concluído com sucesso → status atualizado para "Concluído" (`value = 1`).
            - `2`: Erro durante o upload → status atualizado para "Erro" (`value = 2`) e adiciona a mensagem de erro.
            - `3`: Upload cancelado → status atualizado para "Cancelado" (`value = 3`).
        7. Emite novamente o evento `check_queue_data` para atualizar a interface.
        8. Marca a tarefa como concluída na fila `UPLOAD_QUEUE`.

        Dados recebidos do `upload_core`:
        -----------------------------------
        `upload_core` é um objeto da classe `UploadChapters` e contém os seguintes atributos:
        
        - **id** (`str`): Identificador único do upload.
        - **chapter** (`str`): Número do capítulo sendo enviado.
        - **manga_id** (`str`): Identificador do mangá no servidor.
        - **manga_title** (`str`): Nome do mangá correspondente ao upload.
        - **groups** (`list[dict]`): Lista de grupos de scan envolvidos no upload.
        Exemplo:
        ```json
        [
            {"id": "9ede94bc-aeb5-49b8-b72d-ea516de5ed05", "name": "Izakaya Scans"}
        ]
        ```
        - **path** (`str`): Caminho do diretório onde os arquivos do capítulo estão armazenados localmente.
        - **language** (`str`): Código do idioma do capítulo (ex: `"pt-br"`).
        - **pre_notif** (`dict`): Dados para exibição de notificações pré-upload.
        Exemplo:
        ```json
        {
            "manga_title": "Unlocking her",
            "chapter": "31",
            "status": 0,
            "detail": None,
            "error": None
        }
        ```
        - **progress_data** (`dict`): Informações sobre o progresso do upload.
        Exemplo:
        ```json
        {
            "percentage": 0,
            "completed": 0,
            "total": 0,
            "pages": {}
        }
        ```
        - **socket** (`SocketIO`): Objeto para comunicação em tempo real via WebSocket.

        Tratamento de exceções:
        ------------------------
        - Se a fila estiver vazia (`queue.Empty`), a função aguarda 1 segundo antes de tentar novamente.

        Atributos utilizados:
        ----------------------
        - `UPLOAD_QUEUE`: Fila de uploads pendentes.
        - `QUEUE_CORE`: Gerenciador da fila de uploads (armazenamento e atualização de status).
        - `SOCKET`: Gerenciador de comunicação via WebSocket.
        """

        while True:
            try:
                upload_core = self.get_prioritized_item()
                if upload_core:
                    queue_upload_id = self.QUEUE_CORE.get_by_id(upload_core.id)
                    if queue_upload_id:
                        self.CURRENT_QUEUE = upload_core
                        
                        if queue_upload_id['status']['value'] == 3:
                            self.UPLOAD_QUEUE.task_done()
                            self.CURRENT_QUEUE = None
                            continue
                        
                        self.QUEUE_CORE.update_field(
                            unique_id=upload_core.id,
                            section="uploads",
                            updates={
                                "status": {
                                    'type': "Processando",
                                    'value': 4
                                }
                            }
                        )

                        self.SOCKET.emit('check_queue_data')

                        result = upload_core.setup()

                        """
                        Resultados possíveis
                        1 = Sucesso
                        2 = Erro
                        3 = Cancelado
                        """

                        if result['st'] == 1:
                            self.QUEUE_CORE.update_field(
                                unique_id=upload_core.id,
                                section="uploads",
                                updates={
                                    "status": {
                                        'type': "Concluído",
                                        'value': 1
                                    }
                                }
                            )

                        elif result['st'] == 2:
                            self.QUEUE_CORE.update_field(
                                unique_id=upload_core.id,
                                section="uploads",
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
                            current_status = self.QUEUE_CORE.get_by_id(upload_core.id).get('status', {}).get('value')

                            # Verifica se o status já não está como "Cancelado"
                            if current_status != 3:
                                self.QUEUE_CORE.update_field(
                                    unique_id=upload_core.id,
                                    section="uploads",
                                    updates={
                                        "status": {
                                            'type': "Cancelado",
                                            'value': 3,
                                            'detail': result['d']
                                        }
                                    }
                                )

                        self.SOCKET.emit('check_queue_data')
                        self.UPLOAD_QUEUE.task_done()
                        self.CURRENT_QUEUE = None

                else:
                    continue

            except queue.Empty:
                continue

    def add(self, core):
        with self.lock:
            if isinstance(core, list):
                for item in core:
                    self.UPLOAD_QUEUE.put(item)
            else:
                self.UPLOAD_QUEUE.put(core)
            sleep(0.2)

    def get(self):
        fila = list(self.UPLOAD_QUEUE.queue)
        if self.CURRENT_QUEUE:
            fila.insert(0, self.CURRENT_QUEUE)  # Adiciona o upload atual no início da fila
        return fila

    def prioritize(self, upload_id):
        """Adiciona um ID à lista de prioridade"""
        if upload_id not in self.PRIORITY_LIST:
            self.PRIORITY_LIST.append(upload_id)

    def get_prioritized_item(self):
        """Obtém um item da fila, priorizando os IDs marcados como prioritários."""
        with self.lock:
            temp_list = []  # Lista temporária para manter a ordem correta

            prioritized_item = None

            # Percorre a fila e verifica se há um item prioritário
            while not self.UPLOAD_QUEUE.empty():
                item = self.UPLOAD_QUEUE.get()
                if item.id in self.PRIORITY_LIST and prioritized_item is None:
                    prioritized_item = item  # Achou um item prioritário!
                    self.PRIORITY_LIST.remove(item.id)  # Remove da lista de prioridades
                else:
                    temp_list.append(item)  # Guarda os outros itens

            # Reinsere os itens na fila na mesma ordem
            for item in temp_list:
                self.UPLOAD_QUEUE.put(item)

            # Se nenhum item prioritário foi encontrado, retorna normalmente da fila
            if not prioritized_item:
                try:
                    return self.UPLOAD_QUEUE.get(timeout=10)
                except queue.Empty:
                    sleep(0.5)
                    return None

            return prioritized_item
