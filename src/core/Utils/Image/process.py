import os
import cv2
import shutil
import zipfile
import tempfile
import numpy as np
from PIL import Image
from time import sleep
from pathlib import Path
from natsort import natsorted
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from src.core.Utils.SmartStitch.process import ConsoleStitchProcess


class ImagePreprocessor:
    def __init__(self, config, long_strip = False):
        self.config = config
        self.long_strip = long_strip
        self.valid_image_extensions = ["jpg", "jpeg", "png", "gif", "bmp", "tiff", "avif", "webp"]
        self.convertible_extensions = ["jpg", "jpeg", "png", "gif"]  # Apenas essas passam para o próximo processamento
        
        output_file_type = self.config.get('output_file_type', '.jpg')
        self.output_image_quality = self.config.get('output_image_quality', 80)
        
        valid_types = {"jpg": ".jpg", "png": ".png"}
        self.output_file_type = valid_types.get(output_file_type.lower(), ".jpg")

    def phash(self, image, hash_size=8, highfreq_factor=4):
        """
        Calcula o pHash (perceptual hash) de uma imagem.
        """
        img_size = hash_size * highfreq_factor
        image = image.convert("L").resize((img_size, img_size), Image.LANCZOS)
        pixels = np.array(image, dtype=np.float32)
        dct = cv2.dct(pixels)
        dct_lowfreq = dct[:hash_size, :hash_size]
        # Excluindo o coeficiente DC se desejar
        med = np.median(dct_lowfreq[1:, 1:])
        diff = dct_lowfreq > med
        hash_value = 0
        for index, value in enumerate(diff.flatten()):
            if value:
                hash_value |= 1 << index
        return hash_value

    def hamming_distance(self, hash1, hash2):
        """
        Calcula a distância de Hamming entre dois inteiros.
        """
        return bin(hash1 ^ hash2).count('1')

    def is_uniform(self, image, threshold=5):
        """
        Verifica se a imagem é praticamente de uma única cor, usando o desvio padrão.
        """
        # Converte para grayscale e obtém os dados em array
        arr = np.array(image.convert("L"))
        return arr.std() < threshold

    def get_image_signature(self, image, hash_size=8, highfreq_factor=4, uniform_threshold=5):
        """
        Retorna uma assinatura para a imagem.
        Para imagens uniformes, inclui também a resolução.
        """
        ph = self.phash(image, hash_size=hash_size, highfreq_factor=highfreq_factor)
        if self.is_uniform(image, threshold=uniform_threshold):
            # Se a imagem é uniforme, inclui a resolução (largura, altura) na assinatura
            return (ph, image.width, image.height)
        else:
            return ph

    def find_and_remove_duplicates(self, temp_dir, hash_size=8, similarity_threshold=5):
        """
        Verifica se há imagens duplicadas em temp_dir e remove as duplicatas,
        usando a assinatura que diferencia imagens uniformes por resolução.
        """
        hash_dict = {}
        image_files = natsorted([f for f in os.listdir(temp_dir) if self.is_valid_image(Path(temp_dir) / f)])
        duplicates_removed = 0

        for file_name in image_files:
            file_path = Path(temp_dir) / file_name
            try:
                with Image.open(file_path) as img:
                    signature = self.get_image_signature(img, hash_size=hash_size)
            except Exception as e:
                print(f"Erro ao processar {file_name}: {e}")
                continue

            # Se já vimos uma imagem com assinatura semelhante
            found_duplicate = False
            for seen_signature, seen_path in list(hash_dict.items()):
                # Se ambas as assinaturas são tuplas, compare o pHash e a resolução
                if isinstance(signature, tuple) and isinstance(seen_signature, tuple):
                    ph_diff = self.hamming_distance(signature[0], seen_signature[0])
                    if ph_diff <= similarity_threshold and signature[1:] == seen_signature[1:]:
                        print(f"Removendo duplicata (imagem uniforme): {file_path} (similar a {seen_path})")
                        os.remove(file_path)
                        duplicates_removed += 1
                        found_duplicate = True
                        break
                # Se ambas não são tuplas (imagens não uniformes), compare apenas o pHash
                elif not isinstance(signature, tuple) and not isinstance(seen_signature, tuple):
                    ph_diff = self.hamming_distance(signature, seen_signature)
                    if ph_diff <= similarity_threshold:
                        print(f"Removendo duplicata: {file_path} (similar a {seen_path})")
                        os.remove(file_path)
                        duplicates_removed += 1
                        found_duplicate = True
                        break
                else:
                    # Se uma é uniforme e a outra não, consideramos diferentes
                    continue

            if not found_duplicate:
                hash_dict[signature] = file_path

        print(f"Total de imagens duplicadas removidas: {duplicates_removed}")

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
                return new_file_path
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

        print(f"Imagens renomeadas em ordem no diretório temporário: {temp_dir}")

    def check_and_compress_image(self, filepath, current_quality):
        """
        Reduz o tamanho de uma imagem ajustando a qualidade de compressão JPEG.

        Args:
            filepath (str): Caminho para a imagem a ser reduzida.
            current_quality (int): Nível de qualidade para a compressão da imagem (0-100).

        Returns:
            float: Tamanho final do arquivo em MB após compressão.
            None: Se ocorrer um erro ou o arquivo estiver corrompido.
        """
        try:
            # Abrir a imagem original
            with Image.open(filepath) as img:
                temp_file = os.path.join(os.path.dirname(filepath), f"temp_{os.path.splitext(os.path.basename(filepath))[0]}.jpg")

                # Salvar com qualidade reduzida
                img.save(temp_file, format="JPEG", quality=current_quality)

                # Verificar o tamanho do arquivo reduzido
                file_size_mb = os.path.getsize(temp_file) / (1024 * 1024)

                # Pequeno delay para garantir que o arquivo foi escrito corretamente antes da substituição
                sleep(0.1)

                # Substituir o arquivo original pelo reduzido
                shutil.move(temp_file, filepath)

                print(f"Imagem reduzida para {file_size_mb:.2f}MB com qualidade {current_quality}.")
                return file_size_mb

        except Exception as e:
            print(f"Erro ao reduzir tamanho de {os.path.basename(filepath)}: {e}")
            return None

    def calculate_total_size(self, temp_dir):
        """
        Calcula o tamanho total das imagens no diretório em MB.
        """
        total_size = 0
        for filename in os.listdir(temp_dir):
            filepath = os.path.join(temp_dir, filename)
            total_size += os.path.getsize(filepath)
        return total_size / (1024 * 1024)  # Converte para MB

    def reduce_images_iteratively(self, temp_dir, max_total_size_mb=200):
        """
        Reduz o tamanho das imagens iterativamente, começando pelas maiores, até que o total fique abaixo de max_total_size_mb (200).

        Args:
            temp_dir (str): Diretório contendo as imagens.
            max_total_size_mb (int): Tamanho máximo permitido para o diretório.

        Returns:
            bool: True se o tamanho total foi reduzido com sucesso, False caso contrário.
        """
        attempt = 0
        image_qualities = {}  # Dicionário para rastrear a qualidade atual de cada imagem
        max_attempts = self.config['retry']

        while attempt < max_attempts:
            total_size_mb = self.calculate_total_size(temp_dir)

            if total_size_mb <= max_total_size_mb:
                print(f"Tamanho total do capítulo {total_size_mb:.2f}MB.")
                return True  # Redução bem-sucedida

            print(f"Tamanho total do capítulo: {total_size_mb:.2f}MB. Tentativa {attempt + 1} de redução...")

            image_files = natsorted([os.path.join(temp_dir, img) for img in os.listdir(temp_dir)])
            num_images = len(image_files)
            avg_size = total_size_mb / num_images
            
            # Filtra imagens com tamanho menor que avg_size
            large_images = [img for img in image_files if os.path.getsize(img) / (1024 * 1024) > avg_size]

            num_to_reduce = len(large_images) // 2

            for filepath in large_images[:num_to_reduce]:
                current_quality = image_qualities.get(filepath, self.output_image_quality - 15)  # Qualidade inicial ou última usada
                print(f"Reduzindo {os.path.basename(filepath)} com qualidade {current_quality}...")

                reduced_size_mb = self.check_and_compress_image(filepath, current_quality)
                if reduced_size_mb is None:
                    print(f"{os.path.basename(filepath)} foi removido por estar vazio após compressão.")
                    os.remove(filepath)  # Remover o arquivo se estiver vazio
                else:
                    # Atualizar a qualidade para a próxima tentativa (diminui em 5 para cada tentativa)
                    image_qualities[filepath] = max(current_quality - 5, 10)  # Não deixa a qualidade cair abaixo de 10

            attempt += 1

        # Se o tamanho total ainda for maior que o limite após 3 tentativas
        total_size_mb = self.calculate_total_size(temp_dir)
        if total_size_mb > max_total_size_mb:
            print(f"Não foi possível reduzir o capítulo abaixo de {max_total_size_mb}MB após {max_attempts} tentativas.")
            return False

        return True

    def check_image(self, filepath, destination_folder, extension="jpg"):
        """
        Verifica a altura da imagem. Se a altura for maior que 10.000 pixels:
        - A imagem é processada usando 'cup_image'.
        - O arquivo original é removido.
        - Os arquivos processados são movidos para a pasta de destino.

        :param filepath: Caminho da imagem.
        :param destination_folder: Pasta de destino para os arquivos processados.
        :param extension: Extensão dos arquivos gerados (padrão: 'jpg').
        """
        temp_dir = None
        try:
            # Cria diretório temporário
            temp_dir = tempfile.mkdtemp(prefix='MDU_')

            # Obtém altura da imagem
            with Image.open(filepath) as img:
                height = img.height

            # Se altura for maior que 10.000, processa a imagem
            if height > 10000:
                print(f"Processando imagem {filepath}, altura: {height}")
                self.cup_image(filepath, temp_dir, extension)

                # Remove o arquivo original
                os.remove(filepath)

                # Move arquivos processados para a pasta de destino
                for file in natsorted(os.listdir(temp_dir)):
                    source_item = os.path.join(temp_dir, file)
                    destination_item = os.path.join(destination_folder, file)
                    shutil.move(source_item, destination_item)

                print(f"Arquivos processados movidos para: {destination_folder}")

        except Exception as e:
            print(f"Erro ao processar a imagem '{filepath}': {e}")

        finally:
            # Remove o diretório temporário, se existir
            if temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
    
    def cup_image(self, filepath, temp_dir, extension):
        """
        Divide uma imagem em partes com base no tamanho da altura.

        Args:
            filepath (str): Caminho para a imagem a ser dividida.
            temp_dir (str): Diretório temporário para salvar as partes cortadas.
            extension (str): Extensão para salvar os arquivos cortados.
        """
        import os
        from PIL import Image

        # Abrir a imagem
        image_size = Image.open(filepath)

        # Obter as dimensões da imagem
        width, height = image_size.size

        # Determinar o número de partes com base na altura
        num_parts = min(10, max(2, (height // 5000)))  # Ajusta dinamicamente
        height_part = height // num_parts

        # Altura de cada parte
        height_part = height // num_parts

        # Loop para cortar a imagem em partes
        for i in range(num_parts):
            # Coordenadas de corte para a parte atual
            left = 0
            top = i * height_part
            right = width
            bottom = height if i == num_parts - 1 else (i + 1) * height_part

            # Cortar a parte atual
            current_part = image_size.crop((left, top, right, bottom))

            # Salvar a parte cortada com o nome desejado
            filename = os.path.basename(filepath)
            name, ext = os.path.splitext(filename)
            part_path = os.path.join(temp_dir, f"{name}-{i + 1}.{extension}")
            current_part.save(part_path)

            # Fechar a imagem da parte atual
            current_part.close()

    def preprocess_image(self, filepath, temp_dir):
        """
        Controlador para pré-processar a imagem usando a ferramenta configurada.
        """
        auto_adapt = self.config.get("auto_adapt_cutting_tool", False)
        cutting_tool = self.config.get("cutting_tool", "Pillow")
        
        if auto_adapt:
            if self.long_strip:
                return self.preprocess_image_smartstitch(filepath, temp_dir)
            else:
                return self.preprocess_image_pillow(filepath, temp_dir)

        if cutting_tool == "Pillow":
            return self.preprocess_image_pillow(filepath, temp_dir)
        elif cutting_tool == "SmartStitch":
            return self.preprocess_image_smartstitch(filepath, temp_dir)
        else:
            raise ValueError(f"Ferramenta de corte não suportada: {cutting_tool}")

    def preprocess_image_folder(self, path, temp_dir):
        """
        Controlador para pré-processar a imagem usando a ferramenta configurada,
        garantindo que a pasta original não seja modificada.
        """

        max_workers = self.config.get("image_operations", 1)
        auto_adapt = self.config.get("auto_adapt_cutting_tool", False)
        cutting_tool = self.config.get("cutting_tool", "Pillow")
        td_temp = tempfile.mkdtemp(prefix='MDU_')
        valid_tools = ["Pillow", "SmartStitch"]

        if cutting_tool not in valid_tools:
            cutting_tool = "Pillow"

        if auto_adapt:
            if self.long_strip:
                cutting_tool = "SmartStitch"
            else:
                cutting_tool = "Pillow"

        # Copia todas as imagens válidas para o diretório temporário
        for file in natsorted(os.listdir(path)):
            filepath = Path(path) / file
            if self.is_valid_image(filepath):
                shutil.copy(filepath, td_temp)

        # Remove imagens duplicadas no diretório temporário (NÃO na pasta original)
        self.find_and_remove_duplicates(td_temp)

        if cutting_tool == "Pillow":
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = []
                for file in natsorted(os.listdir(td_temp)):
                    filepath = Path(td_temp) / file
                    # Submete o processamento da imagem como tarefa paralela
                    futures.append(executor.submit(self.preprocess_image_pillow, filepath, temp_dir))
                
                # Aguarda a conclusão de todas as tarefas
                for future in futures:
                    try:
                        future.result()  # Para capturar exceções, se houver
                    except Exception as e:
                        print(f"[INFO] Erro ao processar imagem com Pillow: {e}")
                        if not self.config['upload_on_error']:
                            return False, "Ocorreu um erro ao processar a imagem."
                
                # Remove o diretório 'td_temp'
                try:
                    shutil.rmtree(td_temp)
                except Exception as e:
                    print(f"[INFO] Erro ao remover o diretório temporário {td_temp}: {e}")
                
                # Renomeia as imagens no diretório temporário após o processamento
                self.rename_images_in_order(temp_dir)
                
                r = self.reduce_images_iteratively(temp_dir)
                
                if not r:
                    try:
                        shutil.rmtree(temp_dir)
                    except Exception as e:
                        print(f"Erro ao remover o diretório temporário {temp_dir}: {e}")
                    return False, None

                return True, None

        elif cutting_tool == "SmartStitch":
            x, y = self.preprocess_image_smartstitch(td_temp, temp_dir)
            # Remove o diretório 'td_temp'
            try:
                shutil.rmtree(td_temp)
            except Exception as e:
                print(f"Erro ao remover o diretório temporário {td_temp}: {e}")

            r = self.reduce_images_iteratively(temp_dir)

            if not r:
                try:
                    shutil.rmtree(temp_dir)
                except Exception as e:
                    print(f"Erro ao remover o diretório temporário {temp_dir}: {e}")
                return False, "O tamanho total do capítulo não pôde ser reduzido abaixo de 200MB."

            return x, y

        else:
            raise ValueError(f"Ferramenta de corte não suportada: {cutting_tool}")

    def preprocess_image_pillow(self, filepath, temp_dir):
        """
        Pré-processa a imagem usando Pillow:
        - Converte para JPG, se necessário.
        - Divide imagens muito altas em partes menores.
        - Define a qualidade da imagem ao salvar.

        Args:
            filepath (Path): Caminho da imagem original.
            temp_dir (str): Diretório temporário onde as imagens processadas serão armazenadas.
            quality (int, opcional): Qualidade da imagem ao salvar (padrão: 85).

        Returns:
            list: Lista de caminhos das imagens processadas.
        """

        processed_paths = []

        extension = filepath.suffix.lower().lstrip(".")
        original_file_path = filepath

        with tempfile.TemporaryDirectory() as td_:
            # Converte para JPG se necessário
            if extension not in self.convertible_extensions:
                filepath = Path(self.convert_to_jpg(filepath, td_))
                if not filepath:
                    print("Erro ao converter a imagem para JPG.")
                    return processed_paths

            # Abre a imagem para verificar as dimensões
            with Image.open(filepath) as img:
                # Converte para RGB se necessário e apenas se o output for JPG/JPEG
                if self.output_file_type in [".jpg", ".jpeg"] and img.mode != "RGB":
                    img = img.convert("RGB")

                width, height = img.size

                # Determinar o número de partes com base na altura
                num_parts = min(10, max(2, (height // 5000)))  # Ajusta dinamicamente
                height_part = height // num_parts

                if height > 10000:
                    # Divide a imagem em partes menores
                    height_part = height // num_parts
                    for i in range(num_parts):
                        left, top = 0, i * height_part
                        right, bottom = width, (i + 1) * height_part
                        cropped = img.crop((left, top, right, bottom))
                        part_path = os.path.join(td_, f"{filepath.stem}_{i}{self.output_file_type}")
                        cropped.save(part_path, "JPEG", quality=self.output_image_quality)
                        cropped.close()
                        processed_paths.append(part_path)

                    if filepath != original_file_path:
                        filepath.unlink(missing_ok=True)
                else:
                    # Apenas copia a imagem como está para o diretório temporário
                    processed_path = os.path.join(td_, f"{filepath.stem}{self.output_file_type}")
                    img.save(processed_path, "JPEG", quality=self.output_image_quality)
                    processed_paths.append(processed_path)

            # Move todos os arquivos processados para `temp_dir`
            for path in processed_paths:
                shutil.move(str(path), temp_dir)

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
        for file in natsorted(os.listdir(temp_dir)):
            filepath = os.path.join(temp_dir, file)
            self.check_image(filepath, temp_dir)

        return True, None

    def extract_archive(self, archive_path, extract_to, force_preprocess=False):
        max_workers = self.config.get("image_operations", 1)
        auto_adapt = self.config.get("auto_adapt_cutting_tool", False)
        cutting_tool = self.config.get("cutting_tool", "Pillow")
        prex_ = self.config.get('preprocess_images', False)
        upload_on_error = self.config.get('upload_on_error', False)
        failed = False
        msg = ""

        if force_preprocess:
            prex_ = True

        if auto_adapt:
            if self.long_strip:
                cutting_tool = "SmartStitch"
            else:
                cutting_tool = "Pillow"

        try:
            with zipfile.ZipFile(archive_path, 'r') as zip_ref:
                zip_ref.extractall(extract_to)

                # Remove imagens duplicadas
                self.find_and_remove_duplicates(extract_to)

                if prex_:
                    if cutting_tool == "Pillow":
                        temp_dir = tempfile.mkdtemp(prefix='MDU_')
                        with ThreadPoolExecutor(max_workers=max_workers) as executor:
                            futures = []
                            for extracted_file in natsorted(os.listdir(extract_to)):
                                extracted_path = Path(extract_to) / extracted_file
                                if self.is_valid_image(extracted_path):

                                    # Submete o processamento da imagem como tarefa paralela
                                    futures.append(executor.submit(self.preprocess_image, extracted_path, temp_dir))

                            # Aguarda a conclusão de todas as tarefas
                            for future in futures:
                                try:
                                    future.result()  # Para capturar exceções, se houver
                                except Exception as e:
                                    failed = True
                                    msg += f"[INFO][ERROR] Erro ao processar imagem: {str(e)}\n"

                            if failed and not upload_on_error:
                                return False, msg

                            # Renomeia as imagens no diretório temporário após o processamento
                            self.rename_images_in_order(temp_dir)

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

                    elif cutting_tool == "SmartStitch":
                        temp_dir = tempfile.mkdtemp(prefix='MDU_')

                        # Processa a pasta
                        x, y = self.preprocess_image_folder(extract_to, temp_dir)

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
