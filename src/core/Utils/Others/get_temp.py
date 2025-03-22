import os
import tempfile

def calculate_temp_folders_size():
    temp_dir = tempfile.gettempdir()
    total_size = 0

    for folder_name in os.listdir(temp_dir):
        if folder_name.startswith('MDU_'):  # Verifica se a pasta começa com o prefixo MDU_
            folder_path = os.path.join(temp_dir, folder_name)
            if os.path.isdir(folder_path):  # Certifica-se de que é uma pasta
                for root, dirs, files in os.walk(folder_path):
                    for file in files:
                        file_path = os.path.join(root, file)
                        try:
                            total_size += os.path.getsize(file_path)
                        except:
                            pass
    return total_size