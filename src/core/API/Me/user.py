import requests

class UserMe:
    """
    Classe responsável por obter informações do usuário autenticado utilizando a API.

    Atributos:
        login_core (object): Objeto responsável pelo gerenciamento de autenticação do usuário.
        config_core (object): Objeto de configuração do sistema para carregar as configurações da API.
        user (dict | None): Armazena as informações do usuário após uma solicitação bem-sucedida.
    """

    def __init__(self, login_core, config_core) -> None:
        """
        Inicializa a classe UserMe com os objetos de login e configuração.

        Args:
            login_core (object): Objeto de autenticação para carregar dados do usuário e tokens de acesso.
            config_core (object): Objeto de configuração para acessar a URL da API e outras configurações.
        """
        self.login_core = login_core
        self.config_core = config_core
        self.user = None
    
    def get_login(self):
        """
        Obtém as informações de login do usuário.

        Returns:
            dict: Dados de autenticação do usuário, incluindo tokens de acesso e ID do cliente.
        """
        return self.login_core.load_data()
    
    def load_config(self):
        """
        Carrega a configuração atual do sistema.

        Returns:
            dict: Dicionário contendo as configurações da API, como a URL base da API.
        """
        return self.config_core.load_config()
    
    def get_user_me(self):
        """
        Obtém as informações do usuário autenticado a partir da API.

        O método realiza as seguintes etapas:
        1. Carrega os dados de autenticação do usuário.
        2. Tenta atualizar o token de acesso usando o `refresh_token`.
        3. Caso o token seja válido, faz uma requisição para obter as informações do usuário.
        4. Retorna os dados do usuário ou `None` em caso de falha.

        Returns:
            dict | None: Dicionário com informações do usuário autenticado se a solicitação for bem-sucedida,
                         ou `None` se ocorrer um erro de autenticação ou falha na requisição.

        Exemplo de retorno:
        {
            "result": "ok",
            "response": "entity",
            "data": {
                "id": "535deafe-b057-4368-82b3-bf20b8dfed54",
                "type": "user",
                "attributes": {
                    "username": "OneDefauter",
                    "roles": [
                        "ROLE_BOT",
                        "ROLE_GROUP_MEMBER",
                        "ROLE_MEMBER",
                        "ROLE_POWER_UPLOADER"
                    ],
                    "version": 5779
                },
                "relationships": [
                    {
                        "id": "73206838-6025-4bcd-a54d-b666e3b26b27",
                        "type": "scanlation_group"
                    }
                ]
            }
        }
        """
        data = self.get_login()
        config = self.load_config()
        
        if data is None:
            return None
        
        # Atualiza o token de acesso usando o refresh_token
        access_token = self.login_core.refresh_access_token(
            refresh_token=data['refresh_token'], 
            client_id=data['client_id'], 
            client_secret=data['client_secret']
        )

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
