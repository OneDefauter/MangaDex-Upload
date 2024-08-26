import os
import subprocess

last_folder = None

def select_folder():
    global last_folder
    try:
        command = "zenity --file-selection --directory --title='Selecione uma pasta'"
        if last_folder:
            command += f" --filename='{last_folder}/'"
        result = subprocess.run(
            command, 
            shell=True, 
            stdout=subprocess.PIPE, 
            text=True, 
            encoding=os.device_encoding(1)
        )
        if result.returncode == 0 and result.stdout:
            folder_path = result.stdout.strip()
            last_folder = folder_path
            return folder_path
        else:
            return None
    except Exception as e:
        print(f"Erro ao selecionar pasta: {e}")
        return None
