import os
from zipfile import ZipFile

def contains_images_in_folder(folder_path):
    """Verifica se há imagens diretamente na pasta."""
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'}
    for item in os.listdir(folder_path):
        if os.path.splitext(item)[1].lower() in image_extensions:
            return True
    return False

def contains_images_in_zip(zip_path):
    """Verifica se há imagens dentro de um arquivo zip."""
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'}
    try:
        with ZipFile(zip_path, 'r') as zip_file:
            for file in zip_file.namelist():
                if os.path.splitext(file)[1].lower() in image_extensions:
                    return True
    except Exception as e:
        print(f"Erro ao verificar zip: {e}")
    return False