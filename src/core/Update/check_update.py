import requests
from requests.exceptions import ConnectionError, Timeout
from packaging import version
from __init__ import __version__

namespace = "OneDefauter"
repo = f"https://api.github.com/repos/{namespace}/MangaDex-Upload/releases/latest"

local_version = version.parse(__version__)

new_update = False
lcver_ = local_version

try:
    remote_release = requests.get(repo, timeout=10)
    if remote_release.ok:
        release = remote_release.json()
        remote_version = version.parse(release["tag_name"])
        
        rmver_ = remote_version
        lcver_ = local_version
        
        if remote_version > local_version:
            new_update = True
            print("Nova atualização disponível!")
            print(f"Versão nova: {release['tag_name']}")
            print(f"Versão local: {local_version} \n\n")
        else:
            print("Você está na última versão!")
            print(f"Versão: {lcver_} \n\n")
    else:
        print(f"Erro ao buscar versão remota: {remote_release.status_code} \n\n")
except ConnectionError:
    print("Erro de conexão: Não foi possível verificar atualizações.")
    print(f"Usando a versão local: {local_version} \n\n")
except Timeout:
    print("Erro: O tempo limite para conexão foi excedido. \n\n")
except Exception as e:
    print(f"Ocorreu um erro inesperado: {e} \n\n")
