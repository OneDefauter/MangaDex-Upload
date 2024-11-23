import os
import shutil
import zipfile
import tempfile
from PIL import Image
from pathlib import Path
from natsort import natsorted
from concurrent.futures import ThreadPoolExecutor
from src.core.Utils.SmartStitch.process import ConsoleStitchProcess

class ImagePreprocessor:
    def __init__(self, config, num_parts=5):
        self.config = config
        self.num_parts = num_parts
        self.valid_image_extensions = ["jpg", "jpeg", "png", "gif", "bmp", "tiff", "avif", "webp"]
        self.convertible_extensions = ["jpg", "jpeg", "png", "gif"]  # Apenas essas passam para o próximo processamento
        
        output_file_type = self.config.get('output_file_type', '.jpg')
        self.output_image_quality = self.config.get('output_image_quality', 100)
        
        valid_types = {"jpg": ".jpg", "png": ".png"}
        self.output_file_type = valid_types.get(output_file_type.lower(), ".jpg")

    def is_valid_image(self, filepath):
        """
        Verifica se o arquivo tem uma extensão válida.
        """
        extension = filepath.suffix.lower().lstrip(".")
        return extension in self.valid_image_extensions

    def convert_to_jpg(self, filepath, temp_dir):
        """
        Converte a imagem para JPG, se necessário, e retorna o caminho da nova imagem.
        """
        new_file_path = os.path.join(temp_dir, f"{os.path.splitext(filepath.name)[0]}.jpg")
        try:
            with Image.open(filepath) as img:
                # Converte para RGB (necessário para JPG) e salva como JPG
                img = img.convert("RGB")
                img.save(new_file_path, "JPEG")
        except Exception as e:
            print(f"Erro ao converter a imagem para JPG: {e}")
            return None

        return new_file_path

    def rename_images_in_order(self, temp_dir):
        """
        Renomeia as imagens em um diretório em ordem numérica (0001.jpg, 0002.jpg, ...),
        garantindo que não haja substituição de arquivos.
        """
        # Lista todos os arquivos no diretório e ordena naturalmente
        image_files = natsorted([f for f in os.listdir(temp_dir) if self.is_valid_image(Path(temp_dir) / f)])

        for index, file_name in enumerate(image_files, start=1):
            old_path = Path(temp_dir) / file_name
            new_name = f"{index:04d}{old_path.suffix}"  # Exemplo: 0001.jpg
            new_path = Path(temp_dir) / new_name

            # Garante que o novo nome não colida com nenhum arquivo existente
            if new_path.exists():
                raise FileExistsError(f"Erro: O arquivo {new_name} já existe no diretório {temp_dir}.")

            os.rename(old_path, new_path)

        print(f"Imagens renomeadas em ordem no diretório {temp_dir}.")

    def preprocess_image(self, filepath, temp_dir):
        """
        Controlador para pré-processar a imagem usando a ferramenta configurada.
        """
        cutting_tool = self.config.get("cutting_tool", "Pillow")
        if cutting_tool == "Pillow":
            return self.preprocess_image_pillow(filepath, temp_dir)
        elif cutting_tool == "SmartStitch":
            return self.preprocess_image_smartstitch(filepath, temp_dir)
        else:
            raise ValueError(f"Ferramenta de corte não suportada: {cutting_tool}")

    def preprocess_image_folder(self, path, temp_dir):
        """
        Controlador para pré-processar a imagem usando a ferramenta configurada.
        """
        
        max_workers = self.config.get("image_operations", 1)
        cutting_tool = self.config.get("cutting_tool", "Pillow")
        if cutting_tool == "Pillow":
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = []
                for file in natsorted(os.listdir(path)):
                    filepath = Path(path) / file
                    if self.is_valid_image(filepath):
                        # Submete o processamento da imagem como tarefa paralela
                        futures.append(executor.submit(self.preprocess_image_pillow, filepath, temp_dir))
                
                # Aguarda a conclusão de todas as tarefas
                for future in futures:
                    try:
                        future.result()  # Para capturar exceções, se houver
                    except Exception as e:
                        print(f"Erro ao processar imagem com Pillow: {e}")
                
                # Renomeia as imagens no diretório temporário após o processamento
                self.rename_images_in_order(temp_dir)
                
                return True, None
        
        elif cutting_tool == "SmartStitch":
            return self.preprocess_image_smartstitch(path, temp_dir)
        
        else:
            raise ValueError(f"Ferramenta de corte não suportada: {cutting_tool}")

    def preprocess_image_pillow(self, filepath, temp_dir):
        """
        Pré-processa a imagem usando Pillow:
        - Converte para JPG, se necessário.
        - Divide imagens muito altas em partes menores.
        """
        processed_paths = []

        extension = filepath.suffix.lower().lstrip(".")
        original_file_path = filepath

        # Converte para JPG se necessário
        if extension not in self.convertible_extensions:
            filepath = Path(self.convert_to_jpg(filepath, temp_dir))
            if not filepath:
                print("Erro ao converter a imagem para JPG.")
                return processed_paths

        # Abre a imagem para verificar as dimensões
        with Image.open(filepath) as img:
            width, height = img.size

            if height > 10000:
                # Divide a imagem em partes menores
                height_part = height // self.num_parts
                for i in range(self.num_parts):
                    left, top = 0, i * height_part
                    right, bottom = width, (i + 1) * height_part
                    cropped = img.crop((left, top, right, bottom))
                    part_path = os.path.join(temp_dir, f"{filepath.stem}_{i}.{self.output_file_type}")
                    cropped.save(part_path, "JPEG")
                    cropped.close()
                    processed_paths.append(part_path)

                if filepath != original_file_path:
                    filepath.unlink(missing_ok=True)
            else:
                # Apenas copia a imagem como está para o diretório temporário
                processed_path = os.path.join(temp_dir, f"{filepath.stem}.{self.output_file_type}")
                img.save(processed_path, "JPEG")
                processed_paths.append(processed_path)

        if filepath != original_file_path:
            original_file_path.unlink(missing_ok=True)

        return processed_paths

    def preprocess_image_smartstitch(self, path, temp_dir):
        """
        Pré-processa a imagem usando SmartStitch.
        """
        
        kwargs = {
            'input_folder': path,
            'output_folder': temp_dir,
            'split_height': 5000,
            'output_type': self.output_file_type,  # Escolha entre ['.png', '.jpg', '.webp', '.bmp', '.tiff', '.tga', '.psd']
            'custom_width': -1,  # Default=-1 (Desabilitado)
            'detection_type': 'pixel',  # Escolha entre ['none', 'pixel']
            'detection_senstivity': 90,  # De 0 a 100
            'lossy_quality': self.output_image_quality,  # De 1 a 100
            'ignorable_pixels': 5,  # Valor padrão = 5
            'scan_line_step': 5,  # De 1 a 100
        }
        process = ConsoleStitchProcess()
        process.run(kwargs)
        return True, None

    def extract_archive(self, archive_path, extract_to):
        max_workers = self.config.get("image_operations", 1)
        cutting_tool = self.config.get("cutting_tool", "Pillow")
        prex_ = self.config.get('preprocess_images', False)
        os.makedirs(extract_to, exist_ok=True)

        try:
            with zipfile.ZipFile(archive_path, 'r') as zip_ref:
                zip_ref.extractall(extract_to)
                
                if prex_:
                    if cutting_tool == "Pillow":
                        with ThreadPoolExecutor(max_workers=max_workers) as executor:
                            futures = []
                            for extracted_file in natsorted(os.listdir(extract_to)):
                                extracted_path = Path(extract_to) / extracted_file
                                if self.is_valid_image(extracted_path):
                                    # Submete o processamento da imagem como tarefa paralela
                                    futures.append(executor.submit(self.preprocess_image, extracted_path, extract_to))
                            
                            # Aguarda a conclusão de todas as tarefas
                            for future in futures:
                                try:
                                    future.result()  # Para capturar exceções, se houver
                                except Exception as e:
                                    print(f"Erro ao processar imagem: {e}")
                            
                            # Renomeia as imagens no diretório temporário após o processamento
                            self.rename_images_in_order(temp_dir)
                    
                    elif cutting_tool == "SmartStitch":
                        temp_dir = tempfile.mkdtemp(prefix='MDU_')

                        # Processa a pasta
                        self.preprocess_image_folder(extract_to, temp_dir)

                        # Limpa o diretório 'extract_to'
                        for filename in os.listdir(extract_to):
                            file_path = os.path.join(extract_to, filename)
                            try:
                                if os.path.isfile(file_path) or os.path.islink(file_path):
                                    os.unlink(file_path)  # Remove arquivos ou links simbólicos
                                elif os.path.isdir(file_path):
                                    shutil.rmtree(file_path)  # Remove diretórios
                            except Exception as e:
                                print(f"Erro ao deletar {file_path}: {e}")

                        # Move os arquivos de 'temp_dir' para 'extract_to'
                        for filename in os.listdir(temp_dir):
                            temp_file_path = os.path.join(temp_dir, filename)
                            dest_file_path = os.path.join(extract_to, filename)
                            try:
                                shutil.move(temp_file_path, dest_file_path)
                            except Exception as e:
                                print(f"Erro ao mover {temp_file_path} para {dest_file_path}: {e}")

                        # Remove o diretório 'temp_dir'
                        try:
                            shutil.rmtree(temp_dir)
                        except Exception as e:
                            print(f"Erro ao remover o diretório temporário {temp_dir}: {e}")
                    
            
            return True, None
        except Exception as e:
            return False, str(e)
