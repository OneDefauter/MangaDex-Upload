import os
import subprocess
from pathlib import Path

from src.core.Utils.Others.folders import file_dialog

last_file = None

def select_file():
    global last_file
    try:
        file_filter = "Arquivo CBZ ou Zip (*.cbz;*.zip)|*.cbz;*.zip"
        result = subprocess.run(
            [file_dialog, 'Open', 'ThisPC' if not last_file else last_file, file_filter], 
            shell=True, 
            stdout=subprocess.PIPE, 
            text=True, 
            encoding=os.device_encoding(1)
        )
        if result.returncode == 0 and result.stdout:
            file_path = result.stdout.strip().strip('"')
            last_file = Path(file_path).parent
            return file_path
        else:
            return None
    except Exception as e:
        print(f"Erro ao selecionar pasta: {e}")
        return None