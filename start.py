import os
import sys
import hashlib
import tempfile
import subprocess
from io import BytesIO
from zipfile import ZipFile

namespace = "OneDefauter"
repo = f"https://api.github.com/repos/{namespace}/MangaDex-Upload/releases/latest"

def install_modules():
    required_modules = [
        'requests',
        'natsort',
        'Pillow',
        'tqdm',
        'flask',
        'markupsafe',
        'markdown',
<<<<<<< HEAD
        'packaging',
        'cryptography'
=======
        'packaging'
>>>>>>> 7be4dca4f3cd9197a106c689493748421c59e873
    ]

    for module in required_modules:
        try:
            if module == 'Pillow':
                __import__('PIL')
            else:
                __import__(module)
        except ImportError:
            subprocess.run(['pip', 'install', module])

    os.system('cls' if os.name == 'nt' else 'clear')

def calculate_sha1(filepath):
    sha1 = hashlib.sha1()
    with open(filepath, 'rb') as f:
        while True:
            data = f.read(65536)  # Lê o arquivo em blocos de 64KB
            if not data:
                break
            sha1.update(data)
    return sha1.hexdigest()

def download_and_execute():
    temp_folder = tempfile.gettempdir()
    app_folder = os.path.join(temp_folder, "MangaDex Upload (APP)")
    path_file = os.path.join(app_folder, "run.py")
    
    os.makedirs(app_folder, exist_ok=True)
    os.chdir(app_folder)
    sys.path.append(app_folder)
    
    if os.path.exists(path_file):
        hash_ = calculate_sha1(path_file)
        if hash_ != "78fb996cdf2dd82994620e793f1362ad59ab9a87":
            os.remove(path_file)
    
    if os.path.exists(path_file):
        if os.path.exists(os.path.join(app_folder, "__init__.py")):
            with open(os.path.join(app_folder, "__init__.py"), 'r') as file:
                for line in file:
                    if line.startswith('__version__'):
                        __version__ = line.split('=')[1].strip().strip('"\'')
        else:
            __version__ = "0.0" # Force update
    else:
        __version__ = "1.0" # Initial version
    
    if not os.path.exists(path_file) or __version__ == "0.0":
        remote_release = requests.get(repo)
        if remote_release.ok:
            release = remote_release.json()
            zip_resp = requests.get(release["zipball_url"])
            if zip_resp.ok:
                myzip = ZipFile(BytesIO(zip_resp.content))
                zip_root = [z for z in myzip.infolist() if z.is_dir()][0].filename
                zip_files = [z for z in myzip.infolist() if not z.is_dir()]
            
            if not os.path.exists(path_file):
                for fileinfo in zip_files:
                    filename = os.path.join(app_folder, fileinfo.filename.replace(zip_root, ""))
                    dirname = os.path.dirname(filename)
                    os.makedirs(dirname, exist_ok=True)
                    file_data = myzip.read(fileinfo)

                    with open(filename, "wb") as fopen:
                        fopen.write(file_data)

if __name__ == "__main__":
    install_modules()
    import requests
    download_and_execute()
    import run
    