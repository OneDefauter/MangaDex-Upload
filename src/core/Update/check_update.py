import requests

from packaging import version
from __init__ import __version__

namespace = "OneDefauter"
repo = f"https://api.github.com/repos/{namespace}/MangaDex-Upload/releases/latest"

local_version = version.parse(__version__)
remote_release = requests.get(repo)

if remote_release.ok:
    release = remote_release.json()
    remote_version = version.parse(release["tag_name"])
    
    rmver_ = remote_version
    lcver_ = local_version

if remote_version > local_version:
    new_update = True
    print(f"Nova atualização disponível: {release['tag_name']}")
else:
    new_update = False
    print("Você está na última versão!")
