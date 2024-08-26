import os
import subprocess

from src.core.Utils.Others.folders import file_dialog

last_folder = None

def select_folder():
    global last_folder
    try:
        result = subprocess.run(
            [file_dialog, 'Folder', 'ThisPC' if not last_folder else last_folder], 
            shell=True, 
            stdout=subprocess.PIPE, 
            text=True, 
            encoding=os.device_encoding(1)
        )
        if result.returncode == 0 and result.stdout:
            folder_path = result.stdout.strip().strip('"')
            last_folder = folder_path
            return folder_path
        else:
            return None
    except Exception as e:
        print(f"Erro ao selecionar pasta: {e}")
        return None