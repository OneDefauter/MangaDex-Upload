import os
import requests
from io import BytesIO
from zipfile import ZipFile

def updater(data, repo, app_folder):
    if data.get('update') and 'zipUrl' in data:
        zip_url = data['zipUrl']  # URL do ZIP da release no GitHub

        zip_resp = requests.get(zip_url)
        if zip_resp.ok:
            myzip = ZipFile(BytesIO(zip_resp.content))
            zip_root = [z for z in myzip.infolist() if z.is_dir()][0].filename
            zip_files = [z for z in myzip.infolist() if not z.is_dir()]
            
            for fileinfo in zip_files:
                filename = os.path.join(app_folder, fileinfo.filename.replace(zip_root, ""))
                dirname = os.path.dirname(filename)
                os.makedirs(dirname, exist_ok=True)
                file_data = myzip.read(fileinfo)

                with open(filename, "wb") as fopen:
                    fopen.write(file_data)

            return True
        return False

    elif data.get('update'):
        remote_release = requests.get(repo)
    
        if remote_release.ok:
            release = remote_release.json()
            zip_resp = requests.get(release["zipball_url"])
            if zip_resp.ok:
                myzip = ZipFile(BytesIO(zip_resp.content))
                zip_root = [z for z in myzip.infolist() if z.is_dir()][0].filename
                zip_files = [z for z in myzip.infolist() if not z.is_dir()]
                
                for fileinfo in zip_files:
                    filename = os.path.join(app_folder, fileinfo.filename.replace(zip_root, ""))
                    dirname = os.path.dirname(filename)
                    os.makedirs(dirname, exist_ok=True)
                    file_data = myzip.read(fileinfo)

                    with open(filename, "wb") as fopen:
                        fopen.write(file_data)

                return True
            return False
        return False
    return False