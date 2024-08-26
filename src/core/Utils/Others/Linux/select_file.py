import os
import subprocess
from pathlib import Path

last_file = None

def select_file():
    global last_file
    try:
        file_filter = "Arquivos CBZ ou Zip (*.cbz *.zip)"
        command = f"zenity --file-selection --title='Selecione um arquivo' --file-filter='{file_filter}'"
        if last_file:
            command += f" --filename='{last_file}/'"
        result = subprocess.run(
            command, 
            shell=True, 
            stdout=subprocess.PIPE, 
            text=True, 
            encoding=os.device_encoding(1)
        )
        if result.returncode == 0 and result.stdout:
            file_path = result.stdout.strip()
            last_file = Path(file_path).parent
            return file_path
        else:
            return None
    except Exception as e:
        print(f"Erro ao selecionar arquivo: {e}")
        return None
