import src.core.Utils.Module.check as ck

import os
import re
import json
import time
import shutil
import markdown
import requests
import tempfile
import traceback
import webbrowser
from pathlib import Path
from functools import wraps
from markupsafe import Markup
from natsort import natsorted
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone, timedelta
from flask import Flask, render_template, request, flash, redirect, url_for, jsonify, session, send_file
from flask_session import Session
from flask_socketio import SocketIO, emit
from io import BytesIO
from werkzeug.utils import secure_filename

import threading

os.system('cls' if os.name == 'nt' else 'clear')

# src\Core
## API
### Auhtor
from src.core.API.Author.author import GetAuthor

### Chapter
from src.core.API.Chapter.chapter import GetChapter

### Cover
from src.core.API.Cover.cover import GetCover

### Manga
from src.core.API.Manga.manga import GetManga

### Me
from src.core.API.Me.user import UserMe

### Scan
from src.core.API.Scan.scan import GetScan

### User


## update
import src.core.Update.check_update as update
from src.core.Update.updater import updater

## Utils
### Config
from src.core.Utils.Config.config import ConfigFile

### Download
from src.core.Utils.Download.core import DownloadChapters
from src.core.Utils.Download.download import DownloadQueue

### Image
from src.core.Utils.Image.process import ImagePreprocessor

### Login
from src.core.Utils.Login.login import LoginAuth

### MangaUpdates
from src.core.Utils.MangaUpdates.get_series_details import get_series_details, get_final_url, is_same_series

### Others
from src.core.Utils.Others.folders import token_file, log_upload_folder, path_download, android_path, android_path_download
from src.core.Utils.Others.select_file_check import check_for_file
from src.core.Utils.Others.select_folder_check import check_for_folder
from src.core.Utils.Others.get_covers import get_folder_size
from src.core.Utils.Others.get_temp import calculate_temp_folders_size
from src.core.Utils.Others.process_item import process_item
from src.core.Utils.Others.check_path import check_path
from src.core.Utils.Others.check_image import contains_images_in_folder, contains_images_in_zip
from src.core.Utils.Others.DetectLanguageAPI import DetectLanguageAPI

### Queue
from src.core.Utils.Queue.core import QueueCore

### Upload
from src.core.Utils.Upload.core import UploadChapters
from src.core.Utils.Upload.upload import UploadQueue



app = Flask(__name__)
# Configuração do Flask-Session
app.config['SESSION_TYPE'] = 'filesystem'  # Armazena as sessões no sistema de arquivos local
app.config['SESSION_PERMANENT'] = True
app.config['SESSION_FILE_DIR'] = './flask_session'  # Diretório onde os dados serão armazenados
Session(app)
app.secret_key = 'sua_chave_secreta'
socket = SocketIO(app, async_mode='threading')



login_core = LoginAuth()
config_core = ConfigFile()
QUEUE_CORE = QueueCore(socket)

DW_Q = DownloadQueue(socket, QUEUE_CORE)
UP_Q = UploadQueue(socket, QUEUE_CORE)

AUTHOR = GetAuthor(login_core, config_core)
CHAPTER = GetChapter(login_core, config_core)
COVER = GetCover(login_core, config_core)
MANGA = GetManga(login_core, config_core, AUTHOR, COVER, socket)
USER_ME = UserMe(login_core, config_core)
SCAN = GetScan(config_core)

DetectLanguageAPI = DetectLanguageAPI()

cnip_ = False
welcome_seen = False
name_user = None
lang = None
TRANSLATE = None
sq_start = False
last_call = 0

progress_data = {
    'percentage': 0,
    'completed': 0,
    'total': 0,
    'is_running': False
}


temp_folder = tempfile.gettempdir()
app_folder = check_path()

new_update, version = update.check_update()

print('android', android_path)
print('android_download', android_path_download, '\n')
print('temp', temp_folder, '\n\n')

last_folder = None
last_file = None



threading.Thread(target=DW_Q.download, daemon=True).start()
threading.Thread(target=UP_Q.upload, daemon=True).start()

min_datetime = datetime.now().strftime('%Y-%m-%dT%H:%M')
max_datetime = (datetime.now() + timedelta(weeks=2)).strftime('%Y-%m-%dT%H:%M')

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Verifica se o usuário tem um token de acesso na sessão
        if not session.get('access_token'):
            flash("Você precisa estar logado para acessar esta página.")
            return redirect(url_for('login'))  # Redireciona para a página de login
        return f(*args, **kwargs)
    return decorated_function

@app.before_request
def preprocess_request():
    """
    Pré-processa cada requisição para configurar traduções, verificar login e ajustar paths.

    Esta função realiza as seguintes ações antes de cada requisição:
      - Verifica o idioma do usuário a partir do cabeçalho 'Accept-Language'.
      - Carrega as traduções do arquivo JSON correspondente ao idioma do usuário.
      - Se o arquivo JSON foi modificado (comparado pelo timestamp),
        ou se o idioma armazenado na sessão for diferente do atual,
        as traduções são recarregadas e o timestamp é atualizado na sessão.
      - Verifica se o usuário está logado; se não estiver, redireciona para a página de login.
      - Verifica se o usuário está utilizando um dispositivo Android e cria o diretório
        necessário caso ainda não exista.
      - Define a pasta de downloads apropriada conforme o dispositivo (Android ou não).

    Caso o arquivo do idioma solicitado não seja encontrado, utiliza o idioma padrão ('en').
    """
    global cnip_

    # Verifica o idioma do usuário
    user_language = request.headers.get('Accept-Language', 'en').split(',')[0].lower()
    default_language = 'en'
    language_file = os.path.join(app_folder, 'src', 'locale', f'{user_language}.json')

    # Tenta obter o timestamp do arquivo de tradução
    try:
        file_mtime = os.path.getmtime(language_file)
    except FileNotFoundError:
        # Se não encontrar o arquivo do idioma solicitado, utiliza o idioma padrão
        language_file = os.path.join(app_folder, 'src', 'locale', f'{default_language}.json')
        file_mtime = os.path.getmtime(language_file)
        user_language = default_language

    # Verifica se deve recarregar as traduções:
    # 1. Se 'lang' não estiver na sessão
    # 2. Se o idioma armazenado for diferente do idioma atual do usuário
    # 3. Se o timestamp da tradução na sessão não coincidir com o atual
    # 4. Se a flag global cnip_ não estiver definida
    if ('lang' not in session or 
        session.get('lang') != user_language or 
        session.get('TRANSLATE_TIMESTAMP') != file_mtime or 
        not cnip_):

        session['lang'] = user_language
        try:
            with open(language_file, 'r', encoding='utf-8') as file:
                session['TRANSLATE'] = json.load(file)
        except FileNotFoundError:
            # Em caso de erro, tenta carregar o idioma padrão
            fallback_file = os.path.join(app_folder, 'src', 'locale', f'{default_language}.json')
            with open(fallback_file, 'r', encoding='utf-8') as file:
                session['TRANSLATE'] = json.load(file)
            session['lang'] = default_language

        # Atualiza o timestamp das traduções na sessão
        session['TRANSLATE_TIMESTAMP'] = file_mtime

    # Verifica se o usuário está logado, caso contrário, redireciona para a página de login.
    public_routes = ['login', 'static']  # Adicione outras rotas públicas aqui
    if request.endpoint not in public_routes and not session.get('access_token'):
        flash("Você precisa estar logado para acessar esta página.")
        return redirect(url_for('login'))

    # Verifica o agente do usuário para identificar dispositivos Android
    user_agent = request.headers.get('User-Agent', '').lower()
    session['is_android'] = 'android' in user_agent
    if session['is_android'] and not os.path.exists(android_path):
        os.makedirs(android_path, exist_ok=True)
    
    # Define a pasta de downloads conforme o dispositivo e a flag global cnip_
    if session['is_android'] and not cnip_:
        cnip_ = True
        config_core.set_path_download(android_path_download)
    elif not session['is_android'] and not cnip_:
        cnip_ = True
        config_core.set_path_download(path_download)

@app.after_request
def add_cache_header(response):
    # Se o caminho conter /static/ e for um arquivo SVG, adicione o cabeçalho de cache
    if request.path.startswith('/static/') and request.path.lower().endswith('.svg'):
        response.headers['Cache-Control'] = 'public, max-age=31536000'
    return response

@app.errorhandler(500)
def internal_error(error):
    trace = traceback.format_exc()
    return render_template("500.html", error=trace), 500

@socket.on('progress_data_mult_upload')
def handler_progress():
    global progress_data
    socket.emit('get_progress_data_mult_upload', progress_data)

@socket.on('get_queue_data')
def get_queue_data():
    def normalize_chapter(chapter):
        """Normaliza o capítulo para ordenação natural."""
        if not chapter:
            return float('inf')  # Capítulos ausentes vão para o final
        return [int(part) if part.isdigit() else part.lower() for part in re.split(r'(\d+)', chapter)]

    # Carrega os dados do JSON
    queues = QUEUE_CORE.load()

    # Ordenar a fila de uploads
    sorted_queue_upload = natsorted(
        queues.get("uploads", {}).items(),
        key=lambda item: (
            item[1].get('project', {}).get('manga_title', '').lower(),  # Ordena por título em ordem alfabética
            normalize_chapter(item[1].get('chapter', {}).get('chapter', ''))  # Ordena capítulos naturalmente
        )
    )

    # Ordenar a fila de downloads
    sorted_queue_download = natsorted(
        queues.get("downloads", {}).items(),
        key=lambda item: (
            item[1].get('project', {}).get('manga_title', '').lower(),  # Ordena por título em ordem alfabética
            normalize_chapter(item[1].get('chapter', {}).get('chapter', ''))  # Ordena capítulos naturalmente
        )
    )

    # Converte para listas ordenadas com chaves explícitas
    sorted_queue_upload = [{"key": k, **v} for k, v in sorted_queue_upload]
    sorted_queue_download = [{"key": k, **v} for k, v in sorted_queue_download]

    # Monta os dados a serem enviados
    data = {
        "queue_download": sorted_queue_download,
        "queue_upload": sorted_queue_upload
    }

    # Emite os dados para o cliente
    socket.emit('queue_data_send', data)

@socket.on('check_chapter_downloaded')
def handle_check_chapter_downloaded(data):
    """
    Evento WebSocket para verificar se um capítulo foi baixado.
    """
    chapter_id = data.get('chapter_id')
    manga_title = data.get('manga_title', '').strip()
    translated = data.get('translated', '').strip()
    chapter_ = data.get('chapter', '').strip()
    volume = data.get('volume', '').strip()
    groups = data.get('groups', '').split(',')

    config_data = config_core.load_config()
    base_path = Path(config_data['download_folder']) if config_data['download_folder'] else Path.cwd()
    groupName = ', '.join(groups) if groups else None

    possible_paths = []

    # Geração dos caminhos possíveis com base nos esquemas
    for scheme in range(1, 13):
        if scheme == 1:
            if volume and volume != 'none':
                possible_paths.append(base_path / translated / manga_title / f"{chapter_} - v{volume}")
            else:
                possible_paths.append(base_path / translated / manga_title / chapter_)
        elif scheme == 2:
            if volume and volume != 'none':
                possible_paths.append(base_path / translated / manga_title / volume / chapter_)
            else:
                possible_paths.append(base_path / translated / manga_title / chapter_)
        elif scheme == 3:
            if volume and volume != 'none':
                possible_paths.append(base_path / manga_title / translated / volume / chapter_)
            else:
                possible_paths.append(base_path / manga_title / translated / chapter_)
        elif scheme == 4:
            possible_paths.append(base_path / manga_title / translated / chapter_)
        elif scheme == 5:
            if volume and volume != 'none':
                possible_paths.append(base_path / manga_title / volume / chapter_)
            else:
                possible_paths.append(base_path / manga_title / chapter_)
        elif scheme == 6:
            possible_paths.append(base_path / manga_title / chapter_)
        elif scheme == 7:
            possible_paths.append(base_path / groupName / manga_title / chapter_)
        elif scheme == 8:
            if volume and volume != 'none':
                possible_paths.append(base_path / groupName / manga_title / volume / chapter_)
            else:
                possible_paths.append(base_path / groupName / manga_title / chapter_)
        elif scheme == 9:
            possible_paths.append(base_path / translated / groupName / manga_title / chapter_)
        elif scheme == 10:
            if volume and volume != 'none':
                possible_paths.append(base_path / translated / groupName / manga_title / volume / chapter_)
            else:
                possible_paths.append(base_path / translated / groupName / manga_title / chapter_)
        elif scheme == 11:
            possible_paths.append(base_path / groupName / translated / manga_title / chapter_)
        elif scheme == 12:
            if volume and volume != 'none':
                possible_paths.append(base_path / groupName / translated / manga_title / volume / chapter_)
            else:
                possible_paths.append(base_path / groupName / translated / manga_title / chapter_)

    for path in possible_paths:
        if path.exists():
            # Filtrar e ordenar as imagens do capítulo usando natsorted
            supported_extensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif']
            images = natsorted([str(f) for f in path.iterdir() if f.suffix.lower() in supported_extensions])

            # Enviar os dados diretamente via WebSocket
            emit('chapter_downloaded', {
                'downloaded': True,
                'filePath': str(path),
                'images': images,
                'volume': volume,
                'chapter': chapter_
            })
            return

    # Se nenhum capítulo foi encontrado, enviar resposta negativa
    emit('chapter_downloaded', {
        'downloaded': False
    })

@socket.on('check_on_login')
def check_on_login_queue():
    global sq_start, last_call
    current_time = time.time()
    # Se a última chamada foi a menos de 5 segundos, ignora a requisição
    if current_time - last_call < 5:
        return
    last_call = current_time

    if not sq_start:
        r = QUEUE_CORE.check_on_login()
        if r:
            sq_start = r
            socket.emit('close_modal_for_confirmation')

@socket.on('reset_queue')
def reset_queue():
    global sq_start
    sq_start = True
    QUEUE_CORE.reset()
    socket.emit('close_modal_for_confirmation')
    socket.emit('check_queue_data')

@socket.on('send_queue')
def send_queue(data):
    """
    Processa a fila de uploads enviada pelo socket e organiza os capítulos para processamento.

    Args:
        data (dict): Estrutura de dados recebida pelo socket. 
        Exemplo:
        {
            "uploads": {
                "ID1": {
                    "project": {
                        "manga_id": 1,
                        "manga_title": "Manga A"
                    },
                    "chapter": {
                        "path": {
                            "main": "/path/to/main",
                            "temp": "/path/to/temp"
                        },
                        "title": "Capítulo 1",
                        "language": "pt-br",
                        "chapter": "1",
                        "volume": "1"
                    },
                    "others": {
                        "ispre": True
                    }
                }
            }
        }

    Função:
    1. Carrega a configuração atual do sistema.
    2. Reseta a fila se nenhum upload for enviado.
    3. Itera pelos uploads e processa os dados:
        - Verifica se o caminho principal ainda existe.
        - Verifica se o caminho temporário (`temp`) existe:
            - Se existir, mantém o caminho e a flag `ispre` como `True`.
            - Se não existir, define `temp` como `None` e `ispre` como `False`.
        - Atualiza os campos temporários e a estrutura `pre_notif`.
        - Remove o diretório temporário se não existir mais.
    4. Ordena os uploads por `manga_title` e `chapter` usando `natsorted`.
    5. Adiciona os itens na fila de processamento.
    """
    global sq_start
    sq_start = True

    config = config_core.load_config()
    uploads = data.get('uploads', {})
    if not uploads:
        QUEUE_CORE.reset()
        socket.emit('close_modal_for_confirmation')
        return

    socket.emit('close_modal_for_confirmation')

    for upload_id, upload_data in uploads.items():
        path_main = Path(upload_data['chapter']['path']['main'])
        try:
            path_temp = Path(upload_data['chapter']['path']['temp'])
        except:
            path_temp = None

        # Verificar se o caminho principal ainda existe
        if not path_main.exists():
            continue

        # Verificar se o caminho temporário existe
        temp_exists = path_temp and path_temp.exists() and path_temp.is_dir()

        # Atualizar os campos necessários
        updates = {
            'chapter': {
                'path': {
                    'temp': upload_data['chapter']['path']['temp'] if temp_exists else None
                }
            },
            'status': {
                "type": "Aguardando",
                "value": 0,
                "skipped": 0,
                "showing": 1,
                "notif": False,
                "detail": None,
                "error": None
            },
            'others': {
                'ispre': temp_exists
            },
            'pre_notif': {
                "status": 0,
                "detail": None,
                "error": None
            }
        }

        # Atualiza o item usando a função update_field
        QUEUE_CORE.update_field(upload_id, 'uploads', updates)

        # Remover o diretório temporário apenas se não existir mais
        if path_temp and not temp_exists:
            try:
                import shutil
                shutil.rmtree(path_temp)
                socket.emit('calculate_folder')
            except Exception as e:
                continue

    # Ordenar os uploads com base em manga_title e chapter usando natsorted
    sorted_uploads = dict(
        natsorted(
            uploads.items(),
            key=lambda item: (
                item[1]["project"]["manga_title"].lower(),
                item[1]["chapter"]["chapter"]
            )
        )
    )

    for upload_id, upload_data in sorted_uploads.items():
        r = QUEUE_CORE.get_by_id(upload_id)

        upload_core = UploadChapters(
            id=upload_id,
            data=r,
            socket=socket,
            preprocessor=ImagePreprocessor(config),
            config=config_core,
            login=login_core
        )

        UP_Q.add(upload_core)

@socket.on('calculate_folder')
def handler_calculate_folder():
    folder_size = get_folder_size()
    temp_folders_size = calculate_temp_folders_size()
    socket.emit('folder_size', {'folder_size': folder_size, 'temp_folders_size': temp_folders_size})

@socket.on('loading_overlay_display')
def loading_overlay_display():
    socket.emit('loading_overlay_display')

@socket.on('search_project_manga_updates')
def search_project_manga_updates(data):
    md_search_results = None
    obra_existe = False

    url_input = f"https://www.mangaupdates.com/series/{data['data']}"
    details = get_series_details(url_input)
    if details.get("error"):
        ...

    # Extrai os campos desejados
    extracted = {
        "title": details.get("title"),
        "url": details.get("url"),
        "associated": details.get("associated") or [],
        "image_original": details.get("image", {}).get("url", {}).get("original"),
        "type": details.get("type"),
        "year": details.get("year"),
        "latest_chapter": details.get("latest_chapter"),
        "completed": details.get("completed"),
        "genres": [genre.get("genre") for genre in details.get("genres", [])]
    }

    # Mapeamento de type para código de idioma
    type_language_map = {
        "Manhwa": "ko",
        "Manhua": "zh",
        "Manga": "ja"
    }
    original_language = type_language_map.get(extracted["type"], "en")

    md_search_results = MANGA.search_manga_candidates(extracted["title"], extracted["associated"])

    if len(md_search_results) == 0:
        ...

    for manga in md_search_results:
        mu = manga.get('data', {}).get('attributes', {}).get('links', {}).get('mu', None)
        if mu:
            final_url = get_final_url(mu)  # Como no exemplo anterior
            if final_url and is_same_series(url_input, final_url):
                obra_existe = manga
                break

    socket.emit('search_response', {'obra_existe': obra_existe, 'md_search_results': md_search_results, 'MangaUpdates': details, 'original_language': original_language})

@socket.on('search_author')
def search_author(data):
    author = AUTHOR.get_author_list(name=data['query'])
    socket.emit('search_author_response', {"UUID": False, "type": data['type'], "authors": author})

@socket.on('search_author_uuid')
def search_author_uuid(data):
    author = AUTHOR.get_author_uuid(data['query'])
    socket.emit('search_author_response', {"UUID": True, "type": data['type'], "authors": author})

@socket.on('create_author')
def create_author(data):
    author = AUTHOR.create_author(data['name'])
    socket.emit('create_author_response', {'result': author, 'type': data['type']})

@socket.on('create_draft')
def create_draft(data):
    r = MANGA.create_draft(data)
    if r:
        socket.emit('create_draft_response', {'id': r})

@socket.on('send_draft')
def send_draft(data):
    MANGA.send_draft(data)

@app.route('/api/search', methods=['GET'])
def api_search():
    config = config_core.load_config()
    
    query = request.args.get('title')
    offset = int(request.args.get('offset', 0))  # Offset para carregar mais
    limit = int(request.args.get('limit', 12))  # Limite de resultados por requisição
    max_result = config['max_results']  # Máximo de resultados permitido

    if query:
        data = MANGA.get_manga(query, max_result, offset)  # Busca com offset
        if data:
            results = data['results']
            total_results = data['total']  # Total retornado pela API sem o limite do `max_result`

            # Calcula `has_more` corretamente com base no total ajustado e resultados obtidos
            has_more = (offset + len(results)) < total_results

            return jsonify({
                'mangas': results,  # Retorna os resultados com base no offset
                'totalResults': len(results),  # Retorna o total ajustado
                'hasMore': has_more  # Calcula corretamente se há mais resultados
            })
    return jsonify({"error": "Erro ao buscar dados."}), 500

@app.route('/api/manga/<manga_id>', methods=['GET'])
def get_manga_details(manga_id):
    r, manga_details = MANGA.get_manga_details(manga_id)
    if r:
        return jsonify(manga_details)
    return jsonify({"error": "Erro ao buscar detalhes do mangá."}), 500

@app.route('/api/manga/<manga_id>/aggregate', methods=['GET'])
def get_manga_aggregate(manga_id):
    r, sorted_chapters = MANGA.manga_aggregate(manga_id, request.args.get('translatedLanguage'))
    if r:
        return jsonify({'chapters': sorted_chapters})
    return jsonify({"error": "Erro ao buscar capítulos do mangá."}), 500

@app.route('/api/manga/<manga_id>/chapters_with_groups', methods=['GET'])
def get_chapters_with_groups(manga_id):
    """
    Retorna todos os capítulos com informações detalhadas, incluindo grupos de tradução.
    """
    language = request.args.get('language', 'pt-br')  # Idioma padrão: pt-br
    limit = int(request.args.get('limit', 100))  # Número máximo de capítulos por página

    get_chapter_service = GetChapter(login_core, config_core)
    result = get_chapter_service.get_chapters_with_groups(manga_id, language, limit)

    return jsonify(result)

@app.route('/edit/api/manga/<manga_id>/aggregate', methods=['GET'])
def get_manga_aggregate_edit(manga_id):
    translate = session.get('TRANSLATE', {})
    user = USER_ME.get_user_me()
    r, chapters = MANGA.manga_aggregate_uploaded(manga_id, user['id'], request.args.get('translatedLanguage'))
    if r:
        return jsonify({'chapters': chapters})

    return jsonify({"error": translate['error_search_chapters']}), 500

@app.route('/get_chapter_details/<chapter_id>', methods=['GET'])
def get_chapter_details(chapter_id):
    translate = session.get('TRANSLATE', {})
    chapter_details = CHAPTER.get_chapter(chapter_id)
    
    if chapter_details:
        # Acessando os detalhes dentro de 'attributes'
        attributes = chapter_details.get('attributes', {})
        
        chapter_info = {
            'version': attributes['version'],
            'volume': attributes.get('volume', 'N/A'),
            'chapter': attributes.get('chapter', 'N/A'),
            'title': attributes.get('title', 'N/A'),
            'groups': []
        }

        # Procurar pelo nome do grupo de scanlation
        for relationship in chapter_details.get('relationships', []):
            if relationship['type'] == 'scanlation_group':
                group_info = relationship['attributes'].get('name', 'N/A') + f' ({relationship["id"]})'
                chapter_info['groups'].append(group_info)

        return jsonify({'success': True, 'data': chapter_info}), 200
    else:
        return jsonify({'success': False, 'error': translate['chapter_not_found']}), 404



@app.route('/config', methods=['GET', 'POST'])
def config():
    config_data = config_core.load_config()  # Carrega as configurações atuais
    translate = session.get('TRANSLATE', {})  # Obtém traduções da sessão

    if request.method == 'POST':
        # Obtém os valores do formulário
        upload = int(request.form.get('upload'))
        retry = int(request.form.get('retry'))
        log = request.form.get('log') == 'true'
        api_url = request.form.get('api_url')
        auth_url = request.form.get('auth_url')
        max_results = int(request.form.get('max_results'))
        max_results_page = int(request.form.get('max_results_page'))
        download_folder = request.form.get('download_folder')
        download_folder_scheme = request.form.get('download_folder_scheme')
        cover_image_quality = request.form.get('cover_image_quality')
        upload_on_error = request.form.get('upload_on_error') == 'true'
        preprocess_images = request.form.get('preprocess_images') == 'true'
        auto_adapt_cutting_tool = request.form.get('auto_adapt_cutting_tool') == 'true'
        cutting_tool = request.form.get('cutting_tool', 'Pillow')
        output_file_type = request.form.get('output_file_type', 'JPG')
        output_image_quality = int(request.form.get('output_image_quality'))
        queue_operations = int(request.form.get('queue_operations'))
        image_operations = int(request.form.get('image_operations'))
        loading_animation = request.form.get('loading_animation')
        api_key = request.form.get('api_key')

        # Limites para as configurações numéricas
        upload = min(max(upload, 1), 10)
        retry = min(max(retry, 1), 5)
        max_results = min(max(max_results, 1), 100)
        max_results_page = min(max(max_results_page, 8), 20)
        queue_operations = min(max(queue_operations, 1), 10)
        image_operations = min(max(image_operations, 1), 10)
        output_image_quality = min(max(output_image_quality, 0), 100)

        if session['is_android']:
            download_folder = str(android_path_download)

        # Atualiza os dados de configuração
        config_data.update({
            'upload': upload,
            'retry': retry,
            'log': log,
            'api_url': api_url,
            'auth_url': auth_url,
            'max_results': max_results,
            'max_results_page': max_results_page,
            'download_folder': download_folder,
            'download_folder_scheme': download_folder_scheme,
            'cover_image_quality': cover_image_quality,
            'upload_on_error': upload_on_error,
            'preprocess_images': preprocess_images,
            'auto_adapt_cutting_tool': auto_adapt_cutting_tool,
            'cutting_tool': cutting_tool,
            'output_file_type': output_file_type,
            'output_image_quality': output_image_quality,
            'queue_operations': queue_operations,
            'image_operations': image_operations,
            'loading_animation': loading_animation,
            'API_KEY_DETECTLANGUAGE': api_key
        })

        # Salva a configuração
        config_core.save_config(config_data)
        flash(translate.get('config_saved', 'Configurações salvas com sucesso!'))

    # Calcula o tamanho das pastas
    folder_size = get_folder_size()
    temp_folders_size = calculate_temp_folders_size()

    # Renderiza o template com as configurações
    return render_template(
        'config.html',
        config=config_data,
        default_config=config_core.default_config,
        translations=translate,
        folder_size=folder_size,
        temp_folders_size=temp_folders_size
    )

@socket.on('update_filter')
def update_filter(filter_data):
    config_data = config_core.load_config()  # Carrega as configurações atuais

    # Validar e atualizar o filtro no config_data
    config_data['search_filter'] = filter_data
    
     # Salva as configurações atualizadas no arquivo
    config_core.save_config(config_data)

    socket.emit("reload")

@app.route('/restore_defaults', methods=['POST'])
def restore_defaults():
    config_core.save_config(config_core.default_config)
    flash('Configurações restauradas para os padrões!')
    return redirect(url_for('config'))

@app.route('/', methods=['GET', 'POST'])
def login():
    global welcome_seen
    
    translate = session.get('TRANSLATE', {})
    data = login_core.load_data()
    config = config_core.load_config()
    
    if data:
        # Tentativa de atualização do access_token
        access_token = login_core.refresh_access_token(
            data['refresh_token'], data['client_id'], data['client_secret']
        )
        if access_token:
            data['access_token'] = access_token
            login_core.save_data(data)  # Atualiza o access_token
            
            session['access_token'] = access_token
            session['refresh_token'] = data['refresh_token']
            session['logged_in'] = True
            
            return redirect(url_for('home'))

    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        client_id = request.form.get('client_id')
        client_secret = request.form.get('client_secret')
        
        if not all([username, password, client_id, client_secret]):
            flash(translate['login']['python']['fill_all_fields'])
            return render_template('login.html', translations=translate)

        creds = {
            'grant_type': 'password',
            'username': username,
            'password': password,
            'client_id': client_id,
            'client_secret': client_secret
        }

        try:
            # Envia a requisição para obter os tokens
            r = requests.post(
                config['auth_url'],
                data=creds,
                timeout=10  # Adiciona um tempo limite para evitar travamento
            )
            if r.status_code == 200:
                r_json = r.json()
                access_token = r_json.get("access_token")
                refresh_token = r_json.get("refresh_token")
                
                session['access_token'] = access_token
                session['refresh_token'] = refresh_token
                session['logged_in'] = True

                if not access_token or not refresh_token:
                    flash(translate['login']['python']['missing_tokens'])
                    return render_template('login.html', translations=translate)

                # Salva os dados criptografados
                login_core.save_data({
                    'access_token': access_token,
                    'refresh_token': refresh_token,
                    'client_id': client_id,
                    'client_secret': client_secret
                })

                welcome_seen = False
                return redirect(url_for('home'))

            elif r.status_code == 401:
                flash(translate['login']['python']['unauthorized'])
            elif r.status_code == 403:
                flash(translate['login']['python']['forbidden'])
            elif r.status_code == 500:
                flash(translate['login']['python']['server_error'])
            else:
                flash(translate['login']['python']['unexpected_error'].format(status_code=r.status_code, text=r.text))

        except requests.exceptions.Timeout:
            flash(translate['login']['python']['timeout'])
        except requests.exceptions.RequestException as e:
            flash(translate['login']['python']['connection_error'].format(error=str(e)))

    return render_template('login.html', translations=translate)

@app.route('/home', methods=['GET', 'POST'])
def home():
    global welcome_seen
    global name_user
    
    translate = session.get('TRANSLATE', {})
    
    notifications = []
    if new_update:
        # Substitui o placeholder {version} com o valor real de rmver_
        notifications.append(translate['home']['python']['new_update'].format(version=version))
    
    if not welcome_seen:
        user = USER_ME.get_user_me()
        
        if user is None:
            return redirect(url_for('logout'))
        
        name_user = user['attributes']['username']
        
        # Substitui o placeholder {username} com o nome real do usuário
        notifications.append(translate['home']['python']['welcome_message'].format(username=user['attributes']['username']))
        
        if not new_update:
            # Substitui o placeholder {version} com o valor real de lcver_
            notifications.append(translate['home']['python']['up_to_date'].format(version=version))
        
        welcome_seen = True
    
    return render_template(
        'home.html',
        notifications=notifications,
        translations=translate,
        name_user=name_user
    )

@app.route('/logout')
def logout():
    session.clear()
    
    # Remove o arquivo de tokens para efetuar o logout
    if os.path.exists(token_file):
        os.remove(token_file)
        
    flash('Você foi desconectado com sucesso.')
    return redirect(url_for('login'))

@app.route('/download')
def download():
    config_data = config_core.load_config()  # Carrega as configurações atuais
    translate = session.get('TRANSLATE', {})
    return render_template('search.html', translations=translate, mode='download', max_results_page=config_data['max_results_page'])

@app.route('/details/<manga_id>')
def details(manga_id):
    translate = session.get('TRANSLATE', {})
    return render_template('details.html', manga_id=manga_id, translations=translate)

@app.route('/api/download_chapters', methods=['POST'])
def download_chapters():
    config_data = config_core.load_config()
    translate = session.get('TRANSLATE', {})
    skipped_downloads = []
    result = {}

    # Obtém os dados enviados do lado do cliente
    chapters = request.json.get('chapters', [])

    # Gera IDs únicos para cada item
    unique_ids = [QUEUE_CORE.generate_unique_id() for _ in chapters]

    # Carregar as filas atuais
    queues = QUEUE_CORE.load()

    # Adiciona os capítulos à fila de download
    for chapter, unique_id in zip(chapters, unique_ids):
        chapter_id = chapter['chapterId']
        manga_id = chapter['mangaId']
        manga_title = chapter['mangaTitle']
        translated = chapter['translatedLanguage']
        chapter_ = chapter['chapterNumber']
        volume = chapter['volume']
        group = chapter['groups']

        if isinstance(volume, str) and not volume.isdigit():
            volume = None

        group_names = []

        for gp_ in group:
            group_names.append(gp_)

        # Concatena os nomes em uma única string separados por ", "
        groupName = ', '.join(group_names) if group_names else None

        path_ = Path(config_data['download_folder']) if config_data['download_folder'] != '' else os.getcwd()

        if config_data['download_folder_scheme'] == 'scheme1':
            if volume and volume != 'none':
                path = os.path.join(path_, translated, manga_title, f"{chapter_} - v{volume}")
            else:
                path = os.path.join(path_, translated, manga_title, chapter_)
        elif config_data['download_folder_scheme'] == 'scheme2':
            if volume and volume != 'none':
                path = os.path.join(path_, translated, manga_title, volume, chapter_)
            else:
                path = os.path.join(path_, translated, manga_title, chapter_)
        elif config_data['download_folder_scheme'] == 'scheme3':
            if volume and volume != 'none':
                path = os.path.join(path_, manga_title, translated, volume, chapter_)
            else:
                path = os.path.join(path_, manga_title, translated, chapter_)
        elif config_data['download_folder_scheme'] == 'scheme4':
            path = os.path.join(path_, manga_title, translated, chapter_)
        elif config_data['download_folder_scheme'] == 'scheme5':
            if volume and volume != 'none':
                path = os.path.join(path_, manga_title, volume, chapter_)
            else:
                path = os.path.join(path_, manga_title, chapter_)
        elif config_data['download_folder_scheme'] == 'scheme6':
            path = os.path.join(path_, manga_title, chapter_)
        elif config_data['download_folder_scheme'] == 'scheme7':
            path = os.path.join(path_, groupName, manga_title, chapter_)
        elif config_data['download_folder_scheme'] == 'scheme8':
            if volume and volume != 'none':
                path = os.path.join(path_, groupName, manga_title, volume, chapter_)
            else:
                path = os.path.join(path_, groupName, manga_title, chapter_)
        elif config_data['download_folder_scheme'] == 'scheme9':
            path = os.path.join(path_, translated, groupName, manga_title, chapter_)
        elif config_data['download_folder_scheme'] == 'scheme10':
            if volume and volume != 'none':
                path = os.path.join(path_, translated, groupName, manga_title, volume, chapter_)
            else:
                path = os.path.join(path_, translated, groupName, manga_title, chapter_)
        elif config_data['download_folder_scheme'] == 'scheme11':
            path = os.path.join(path_, groupName, translated, manga_title, chapter_)
        elif config_data['download_folder_scheme'] == 'scheme12':
            if volume and volume != 'none':
                path = os.path.join(path_, groupName, translated, manga_title, volume, chapter_)
            else:
                path = os.path.join(path_, groupName, translated, manga_title, chapter_)

        # Verificar se o capítulo já existe no `queues['uploads']`
        existing_entry = next(
            (key for key, value in queues['downloads'].items()
                if value['project']['manga_id'] == manga_id and
                value['chapter']['language'] == translated and
                value['chapter']['groups'] == group_names and
                value['chapter']['chapter'] == chapter and
                value['chapter']['volume'] == volume),
            None
        )

        skipped = 0

        if existing_entry:
            existing_status = queues['downloads'][existing_entry]['status']['value']
            existing_showing = queues['downloads'][existing_entry]['status'].get('showing', 0)

            if existing_status in [0, 4]:  # Ignorar se está Aguardando ou Processando
                skipped = 1

            if existing_status == 1:  # Atualizar apenas se showing == 0
                if existing_showing == 0:
                    unique_id = existing_entry
                else:
                    skipped = 1

            elif existing_status in [2, 3]:
                unique_id = existing_entry

        result[unique_id] = {
            "project": {
                "manga_id": manga_id,
                "manga_title": manga_title
            },
            "chapter": {
                "id": chapter_id,
                "language": translated,
                "groups": group_names,
                "chapter": chapter_,
                "volume": volume,
                "path": str(path)
            },
            "status": {
                "type": "Aguardando",
                "value": 0,
                "skipped": skipped,
                "showing": 1,
                "notif": False,
                "detail": None,
                "error": None
            },
            "pre_notif": {
                "manga_title": manga_title,
                "chapter": chapter_,
                "volume": volume,
                "status": 0,
                "detail": None,
                "error": None
            }
        }

    if len(result) == 0:
        return jsonify({'status': 'error', 'message': 'Nenhum capítulo foi passado.'})

    # Verificar os itens no result
    filtered_result = {}
    for unique_id, upload_data in result.items():
        if upload_data['status']['skipped'] == 1:
            # Adiciona o upload aos skipped_downloads
            skipped_downloads.append({
                'manga_title': upload_data['project']['manga_title'],
                'language': upload_data['chapter']['language'],
                'group': upload_data['chapter']['groups'],
                'volume': upload_data['chapter']['volume'],
                'chapter': upload_data['chapter']['chapter']
            })
        else:
            # Mantém apenas os resultados que não foram pulados
            filtered_result[unique_id] = upload_data

    # Carregar as filas atuais
    queues = QUEUE_CORE.load()

    # Atualizar `queues` com os resultados que não foram pulados
    queues['downloads'].update(filtered_result)

    # Ordenar os downloads com base em manga_title e chapter usando natsorted
    sorted_downloads = dict(
        natsorted(
            filtered_result.items(),
            key=lambda item: (
                item[1]["project"]["manga_title"].lower(),
                item[1]["chapter"]["chapter"]
            )
        )
    )

    # Adicionar os resultados ao UP_Q.queue_upload e inicializar os uploads
    for unique_id, upload_data in sorted_downloads.items():

        # Criação do objeto DownloadChapters
        download_core = DownloadChapters(
            id=unique_id,
            data=upload_data,
            socket=socket,
            config=config_core,
            login=login_core
        )

        DW_Q.add(download_core)

    # Salvar as atualizações no arquivo
    QUEUE_CORE.save(queues)

    # Verificar a lista de status de uploads
    socket.emit("check_queue_data")

    return jsonify({'status': 'success', 'message': 'Capítulos enviados para download em segundo plano.'})

@app.route('/upload', methods=['GET'])
def upload():
    translate = session.get('TRANSLATE', {})
    return render_template('upload.html', min_datetime=min_datetime, max_datetime=max_datetime, translations=translate)

@app.route('/search_projects', methods=['GET'])
def search_projects():
    results = MANGA.search_manga(request.args.get('query', ''))
    return jsonify(results=results)

@app.route('/search_projects_uuid', methods=['GET'])
def search_projects_uuid():
    results = MANGA.get_manga_uuid(request.args.get('uuid', ''))
    return jsonify(results=results)

@app.route('/search_groups', methods=['GET'])
def search_groups():
    query = request.args.get('query', '')
    language = request.args.get('language', '')
    results = SCAN.search_scan(query, language)

    return jsonify(results=results)

@app.route('/search_groups_uuid', methods=['GET'])
def search_groups_uuid():
    results = SCAN.get_scan(request.args.get('uuid', ''))
    return jsonify(results=results)

@app.route('/serve_image', methods=['GET'])
def serve_image():
    file_path = request.args.get('filePath')
    
    try:
        # Certifique-se de que o caminho do arquivo é válido e existe
        if not os.path.exists(file_path):
            return "Arquivo não encontrado.", 404
        
        # Envia o arquivo com o tipo MIME correto
        return send_file(file_path, mimetype='image/jpeg')  # Ajuste o MIME type conforme necessário
    except Exception as e:
        return f"Erro ao carregar imagem: {e}", 500

@app.route('/submit', methods=['POST'])
def submit():
    """
    Adiciona um novo upload de capítulo à fila de uploads.

    Essa rota recebe uma requisição **POST** contendo os dados de um capítulo a ser enviado
    e o adiciona à fila de processamento (`UP_Q`). Antes de adicionar, a função realiza diversas
    verificações para garantir a integridade dos dados.

    Fluxo de execução:
    -------------------
    1. **Carrega as configurações e dados da sessão.**
       - Obtém a tradução (`TRANSLATE`).
       - Gera um identificador único (`unique_id`).
       - Inicializa variáveis como `dir_tmp` (diretório temporário) e `ispre` (pré-processamento de imagens).

    2. **Obtém e processa os dados da requisição.**
       - Determina o caminho do diretório (`path`) com base no sistema operacional (`Android` ou `PC`).
       - Se for um arquivo compactado (`.zip` ou `.cbz`):
         - Extrai as imagens para um diretório temporário.
         - Se ativado, realiza o pré-processamento de imagens (`preprocessor`).
       - Verifica se o diretório contém imagens suportadas.
       - Se o diretório não existir ou estiver vazio, retorna um erro.

    3. **Verifica a existência do mangá e grupos de scan.**
       - Obtém os detalhes do mangá (`MANGA.get_manga_id(data['project']['id'])`).
       - Carrega as informações dos grupos de scan (`SCAN.get_scan(group['id'])`).

    4. **Valida a data de publicação (se fornecida).**
       - Converte a data (`datetime`) para UTC.
       - Garante que a data de publicação não esteja no passado.
       - Limita a publicação futura a um máximo de **2 semanas**.

    5. **Verifica se o upload já existe na fila.**
       - Compara os uploads existentes (`queues['uploads']`) com os novos dados recebidos.
       - Se o capítulo já estiver na fila e ainda estiver em processamento, o upload é ignorado.
       - Se o status do capítulo for `"Concluído"` e não estiver sendo exibido (`showing == 0`), ele pode ser atualizado.
       - Se o status for `"Erro"` ou `"Cancelado"`, ele pode ser reenviado.

    6. **Cria e adiciona o upload à fila (`UP_Q`).**
       - Gera a estrutura dos metadados do upload (`result`).
       - Atualiza a fila `queues['uploads']` com o novo upload.
       - Adiciona o capítulo ao gerenciador de uploads (`UploadChapters`).
       - Salva as atualizações no `QUEUE_CORE`.

    7. **Retorna uma resposta JSON.**
       - Se o upload foi adicionado com sucesso, retorna:
         ```json
         { "success": true, "message": "Upload enviado para fila." }
         ```
       - Se o upload já existia na fila, retorna um erro indicando que o upload já está na fila.
       - Se o projeto não foi encontrado, retorna um erro apropriado.

    Dados esperados na requisição:
    -------------------------------
    ```json
    {
        "project": {
            "title": "Official 'Test' Manga",
            "id": "f9c33607-9180-4ba6-b85c-e4b5faee7192"
        },
        "title": "",
        "groups": [
            {
                "name": "Argos Scan",
                "id": "73206838-6025-4bcd-a54d-b666e3b26b27"
            }
        ],
        "language": "pt-br",
        "volume": "1",
        "chapter": "1",
        "folder": "/caminho/para/pasta",
        "datetime": "2025-02-07T21:44",
        "singleChapter": false
    }
    ```

    Dados armazenados no `QUEUE_CORE`:
    -----------------------------------
    ```json
    {
        "uploads": {
            "unique_id": {
                "project": {
                    "manga_id": "12345",
                    "manga_title": "Nome do Mangá"
                },
                "chapter": {
                    "title": "Título do Capítulo",
                    "language": "pt-br",
                    "groups": [
                        { "id": "grupo1", "name": "Scan A" },
                        { "id": "grupo2", "name": "Scan B" }
                    ],
                    "chapter": "10",
                    "volume": "2",
                    "oneshot": false,
                    "datetime": "2025-02-10T15:30:00",
                    "path": {
                        "main": "/caminho/para/pasta",
                        "temp": "/caminho/temporário"
                    }
                },
                "status": {
                    "type": "Aguardando",
                    "value": 0,
                    "skipped": 0,
                    "showing": 1,
                    "notif": false,
                    "error": null
                },
                "others": {
                    "ispre": true
                },
                "pre_notif": {
                    "manga_title": "Nome do Mangá",
                    "chapter": "10",
                    "status": 0,
                    "detail": null,
                    "error": null
                }
            }
        }
    }
    ```

    Tratamento de exceções:
    ------------------------
    - Se o diretório informado não existir, retorna um erro apropriado.
    - Se a data de publicação for inválida, corrige ou retorna um erro.
    - Se o upload já existir na fila, impede a duplicação.
    - Se ocorrer um erro na extração ou no pré-processamento de imagens, retorna uma mensagem de falha.

    Retorno:
    --------
    - Se o upload for adicionado com sucesso, retorna `{ "success": true, "message": "Upload enviado para fila." }`.
    - Se o capítulo já estiver na fila, retorna `{ "success": false, "message": "Este upload já está na fila." }`.
    - Se o projeto não for encontrado, retorna `{ "success": false, "message": "Projeto não encontrado." }`.
    """

    config = config_core.load_config()
    translate = session.get('TRANSLATE', {})
    unique_id = QUEUE_CORE.generate_unique_id()

    temp_dir = None
    ispre = False
    result = {}
    
    preprocessor = ImagePreprocessor(config)
        
    data = request.get_json()
    
    if session['is_android']:
        path = Path(os.path.join(android_path, data['folder']))
        print(path)
    
    else:
        path = Path(data['folder'])
    
    # Verifica se o caminho existe
    if os.path.exists(str(path)):
        # Verifica se o caminho é uma pasta
        if not os.path.isdir(str(path)):
            # Se não for uma pasta, verifica se é um arquivo compactado
            if path.suffix.lower() in [".zip", ".cbz"]:
                # Cria um diretório temporário para extrair as imagens
                temp_dir = tempfile.mkdtemp(prefix='MDU_')
                success, error_message = preprocessor.extract_archive(path, temp_dir)
                if not success:
                    return jsonify(success=False, message=translate.get('extraction_failed', f'Falha na extração: {error_message}'))
                
                if config['preprocess_images']:
                    ispre = True
            else:
                return jsonify(success=False, message=translate.get('unsupported_file_format', 'Formato de arquivo não suportado.'))
        
        # Verifica se o diretório (ou diretório temporário) contém arquivos
        if not os.listdir(str(path)):
            return jsonify(success=False, message=translate.get('directory_is_empty', 'O diretório está vazio.'))
        
        # Verifica se o diretório contém imagens válidas
        images = [file for file in os.listdir(str(path)) if file.lower().endswith((".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".avif", ".webp"))]
        if len(images) == 0:
            return jsonify(success=False, message=translate.get('directory_contains_no_images', 'O diretório não contém imagens.'))

        if config['preprocess_images']:
            ispre = True
            temp_dir = tempfile.mkdtemp(prefix='MDU_')
            success, error_message = preprocessor.preprocess_image_folder(path, temp_dir)
            if not success:
                return jsonify(success=False, message=translate.get('extraction_failed', f'Falha no pré-processamento: {error_message}'))

    else:
        return jsonify(success=False, message=translate.get('directory_does_not_exist', 'O diretório informado não existe.'))
        
        
    manga = MANGA.get_manga_id(data['project']['id'])
    
    if manga:
        groups = []
        for group in data['groups']:
            group_ = SCAN.get_scan(group['id'])
            if group_:
                groups.append({
                    'id': group_['id'],
                    'name': group_['attributes']['name'],
                    'lang': group_['attributes']['focusedLanguages']
                })

        if data['datetime'] != '':
            try:
                publish_date = datetime.fromisoformat(data['datetime'])
                publish_date = publish_date.astimezone(tz=timezone.utc)
            except ValueError:
                return jsonify(success=False, message=translate.get('invalid_date_format', 'Formato de data inválido.'))
            
            current_utc_time = datetime.now(timezone.utc)
            if publish_date < current_utc_time:
                publish_date = None

            max_date = current_utc_time + timedelta(weeks=2)
            limit_date = current_utc_time + timedelta(weeks=1, days=6, hours=23)
            if publish_date and publish_date > max_date:
                publish_date = limit_date
            
            publish_date_str = publish_date.strftime('%Y-%m-%dT%H:%M:%S') if publish_date else None
            
        else:
            publish_date_str = None
        
        try:
            title = data['title']
        except:
            title = None

        chapter = None if data['singleChapter'] else data['chapter']
        volume = None if data['singleChapter'] else data['volume']

        # Carrega a lista de status de uploads
        queues = QUEUE_CORE.load()
        
        # Verificar se o capítulo já existe no `queues['uploads']`
        existing_entry = next(
            (key for key, value in queues['uploads'].items()
            if value['project']['manga_id'] == data['project']['id'] and
                value['chapter']['language'] == data['language'] and
                value['chapter']['groups'] == [scan['id'] for scan in groups] and
                value['chapter']['chapter'] == chapter and
                value['chapter']['volume'] == volume and
                value['chapter']['path']['main'] == path and
                value['chapter']['oneshot'] == data['singleChapter']),
            None
        )

        if existing_entry:
            existing_status = queues['uploads'][existing_entry]['status']['value']
            existing_showing = queues['uploads'][existing_entry]['status'].get('showing', 0)

            if existing_status in [0, 4]:  # Ignorar se está Aguardando ou Processando
                return jsonify(success=False, message=translate.get('duplicate_upload', 'Este upload já está na fila.'))

            if existing_status == 1:  # Atualizar apenas se showing == 0
                if existing_showing == 0:
                    unique_id = existing_entry
                else:
                    return jsonify(success=False, message=translate.get('duplicate_upload', 'Este upload já está na fila.'))
                
            elif existing_status in [2, 3]:
                unique_id = existing_entry

        scans = []
        for scan in groups:
            name = re.sub(r'\s*\(.*?\)', '', scan['name'])
            scans.append({
                'id': scan['id'],
                'name': name
            })

        # Adiciona ou atualiza o resultado na estrutura desejada
        result[unique_id] = {
            "project": {
                "manga_id": manga['id'],
                "manga_title": manga.get('attributes', {}).get('title', {}).get('en') or next(iter(manga.get('attributes', {}).get('title', {}).values()), 'Título não encontrado')
            },
            "chapter": {
                "title": title,
                "language": data['language'],
                "groups": scans,
                "chapter": chapter,
                "volume": volume,
                "oneshot": data['singleChapter'],
                "datetime": publish_date_str,
                "path": {
                    "main": str(path),
                    "temp": str(temp_dir) if temp_dir else None
                }
            },
            "status": {
                "type": translate.get('waiting', 'Aguardando'),
                "value": 0,
                "skipped": 0,
                "showing": 1,
                "notif": False,
                "detail": None,
                "error": None
            },
            "others": {
                "ispre": ispre
            },
            "pre_notif": {
                "manga_title": manga.get('attributes', {}).get('title', {}).get('en') or next(iter(manga.get('attributes', {}).get('title', {}).values()), 'Título não encontrado'),
                "chapter": chapter,
                "status": 0,
                "detail": None,
                "error": None
            }
        }

        # Carregar as filas atuais
        queues = QUEUE_CORE.load()
        
        # Atualizar `queues` com os resultados que não foram pulados
        queues['uploads'].update(result)

        # Criação do objeto UploadChapters
        upload_core = UploadChapters(
            id=unique_id,
            data=result[unique_id],
            socket=socket,
            preprocessor=preprocessor,
            config=config_core,
            login=login_core
        )
        
        UP_Q.add(upload_core)
        
        # Salvar as atualizações no arquivo
        QUEUE_CORE.save(queues)
        
        # Verificar a lista de status de uploads
        socket.emit("check_queue_data")

        return jsonify(success=True, message=translate.get('upload_added_to_queue', 'Upload enviado para fila.'))
    
    else:
        return jsonify(success=False, message=translate.get('project_not_found', 'Projeto não encontrado.'))

@app.route('/verify_file', methods=['POST'])
def verify_file():
    data = request.json
    filename = data.get('filename')
    app.logger.info(f"Received request to verify file: {filename}")  # Log do arquivo recebido

    if not filename:
        app.logger.error("No filename provided in the request")
        return jsonify({'exists': False, 'message': 'Filename not provided'}), 400

    # Verificar se o arquivo existe
    file_path = android_path / filename
    app.logger.info(f"Checking file path: {file_path}")  # Log do caminho verificado

    if file_path.exists():
        app.logger.info("File exists")
        return jsonify({'exists': True})
    else:
        app.logger.warning("File does not exist")
        return jsonify({'exists': False, 'message': 'File does not exist'})

@app.route('/api/check_tip_seen', methods=['GET'])
def check_tip_seen():
    tip_name = request.args.get('tip_name')
    tip_seen = config_core.is_tip_seen(tip_name)
    return jsonify({'tip_seen': tip_seen})

@app.route('/api/mark_tip_as_seen', methods=['POST'])
def mark_tip_as_seen():
    data = request.get_json()
    tip_name = data.get('tip_name')
    config_core.mark_tip_as_seen(tip_name)
    return jsonify({'success': True})

@app.route('/api/get_tips_status', methods=['GET'])
def get_tips_status():
    config = config_core.load_config()
    tips_status = config.get("tips_seen", {})
    return jsonify(tips_status)

@app.route('/api/update_tip_status', methods=['POST'])
def update_tip_status():
    data = request.get_json()
    tip_name = data.get('tipName')
    seen = data.get('seen', False)  # Novo status (True ou False)

    if not tip_name:
        return jsonify({'success': False, 'message': 'Nome da dica não fornecido.'}), 400

    # Atualiza o status da dica no arquivo de configuração
    config_core.toggle_tip_status(tip_name, seen)

    return jsonify({'success': True})

@app.route('/updates')
def updates():
    global new_update
    global version
    if not new_update:
        new_update, version = update.check_update()
    
    translate = session.get('TRANSLATE', {})

    # URL do arquivo Markdown raw no GitHub
    url = 'https://raw.githubusercontent.com/OneDefauter/MangaDex-Upload/main/src/doc/changelog.md'
    
    # Faça a requisição para obter o conteúdo do arquivo
    response = requests.get(url)
    
    if response.status_code == 200:
        content = response.text
        # Converta o conteúdo Markdown para HTML
        html_content = markdown.markdown(content)
    else:
        html_content = f"<p>{translate.get('update_load_error', 'Não foi possível carregar as atualizações.')}</p>"
    
    # Renderize o template com o conteúdo HTML e as traduções
    return render_template(
        'updates.html',
        content=Markup(html_content),
        new_update=new_update,
        translations=translate,
        repo=update.repo
    )

@app.route('/update', methods=['POST'])
def update_route():
    data = request.get_json()
    r = updater(
        data = data, 
        repo = update.repo, 
        app_folder = app_folder
    )
    
    if r:
        return jsonify(success=True)
    else:
        return jsonify(success=False)

@app.route('/queue')
def queue():
    translate = session.get('TRANSLATE', {})

    return render_template(
        'queue.html',
        translations=translate
    )

@app.route('/delete_item', methods=['POST'])
def delete_item():
    """
    Cancela e remove um item da fila de download ou upload.

    Essa rota recebe uma requisição **POST** contendo os seguintes dados:
    - `type` (`str`): O tipo do item a ser removido (`"download"` ou `"upload"`).
    - `key` (`str`): O identificador único do item na fila.

    Fluxo de execução:
    -------------------
    1. Obtém os dados JSON da requisição.
    2. Verifica o tipo do item (`download` ou `upload`).
    3. Itera sobre a fila correspondente (`DW_Q` para downloads ou `UP_Q` para uploads).
    4. Se encontrar um item com o ID correspondente:
       - Chama `status_cancel()` para cancelar a operação.
       - Atualiza o status do item para `"Cancelado"` (`value = 3`) na `QUEUE_CORE`.
       - Emite um evento via WebSocket (`socket.emit('check_queue_data')`) para atualizar a interface do usuário.
       - Retorna um status **200 OK**.

    Dados esperados na requisição:
    -------------------------------
    ```json
    {
        "type": "upload",
        "key": "30266"
    }
    ```

    Exemplo de funcionamento:
    -------------------------
    1. Se `type` for `"download"`:
       - Itera sobre os downloads em `DW_Q.get()`.
       - Cancela o item correspondente e atualiza seu status na `QUEUE_CORE`.
       - Emite um evento WebSocket para atualizar a interface do usuário.

    2. Se `type` for `"upload"`:
       - Itera sobre os uploads em `UP_Q.get()`.
       - Cancela o item correspondente e atualiza seu status na `QUEUE_CORE`.
       - Emite um evento WebSocket para atualizar a interface do usuário.

    Retorno:
    --------
    - Se o item for encontrado e removido com sucesso, retorna `200 OK`.
    - Se o item não for encontrado, retorna `200 OK` sem alterações.

    Tratamento de erros:
    ---------------------
    - Caso o `type` fornecido não seja `"download"` nem `"upload"`, a função não faz nada e retorna `200 OK`.
    - A conversão da fila para `list(DW_Q.get())` e `list(UP_Q.get())` garante que a iteração não falhe caso a fila esteja vazia.
    """

    data = request.get_json()
    item_type = data.get('type')
    item_key = data.get('key')

    updated = False
    status = QUEUE_CORE.get_by_id(item_key).get('status', {}).get('value')
    
    # Remove da fila de download
    if item_type == 'download':
        for item in list(DW_Q.get()):
            if item_key == item.id:
                if status in [1, 2]:
                    QUEUE_CORE.update_field(
                        unique_id=item_key,
                        section="downloads",
                        updates={
                            "status": {
                                'showing': 0,
                            }
                        }
                    )
                else:
                    item.status_cancel()
                    QUEUE_CORE.update_field(
                        unique_id=item.id,
                        section="downloads",
                        updates={
                            "status": {
                                'type': "Cancelado",
                                'value': 3
                            }
                        }
                    )
                socket.emit('check_queue_data')
                updated = True
                return '', 200
    
    # Remove da fila de upload
    elif item_type == 'upload':
        items = UP_Q.get()
        for item in items:
            if item_key == item.id:
                if status in [1, 2]:
                    QUEUE_CORE.update_field(
                        unique_id=item_key,
                        section="uploads",
                        updates={
                            "status": {
                                'showing': 0,
                            }
                        }
                    )
                else:
                    item.status_cancel()
                    QUEUE_CORE.update_field(
                        unique_id=item.id,
                        section="uploads",
                        updates={
                            "status": {
                                'type': "Cancelado",
                                'value': 3,
                                'detail': "Cancelado pelo usuário",
                            }
                        }
                    )
                socket.emit('check_queue_data')
                updated = True
                return '', 200

    if not updated:
        status = QUEUE_CORE.get_by_id(item_key).get('status', {}).get('value')
        if status in [1, 2, 3]:
            QUEUE_CORE.update_field(
                unique_id=item_key,
                section="uploads",
                updates={
                    "status": {
                        'showing': 0,
                    }
                }
            )
            socket.emit('check_queue_data')
            return '', 200

    return '', 200

@app.route('/prioritize_item', methods=['POST'])
def prioritize_item():
    """
    Prioriza um item na fila de download ou upload.

    Essa rota recebe uma requisição **POST** contendo os seguintes dados:
    - `type` (`str`): O tipo do item a ser priorizado (`"download"` ou `"upload"`).
    - `key` (`str`): O identificador único do item na fila.

    Fluxo de execução:
    -------------------
    1. Obtém os dados JSON da requisição.
    2. Verifica o tipo do item (`download` ou `upload`).
    3. Chama o método `prioritize()` na fila correspondente (`DW_Q` ou `UP_Q`).
    4. Emite um evento WebSocket (`socket.emit('check_queue_data')`) para atualizar a interface do usuário.
    5. Retorna um status **200 OK**.

    Exemplo de requisição:
    ----------------------
    ```json
    {
        "type": "upload",
        "key": "30266"
    }
    ```
    """

    data = request.get_json()
    item_type = data.get('type')
    item_key = data.get('key')

    if not item_key or not item_type:
        return jsonify({"error": "Parâmetros inválidos"}), 400

    # Prioriza na fila de downloads
    if item_type == "download":
        DW_Q.prioritize(item_key)
        socket.emit('check_queue_data')
        return '', 200

    # Prioriza na fila de uploads
    elif item_type == "upload":
        UP_Q.prioritize(item_key)
        socket.emit('check_queue_data')
        return '', 200

    return jsonify({"error": "Tipo inválido"}), 400

@app.route('/retry_item', methods=['POST'])
def retry_item():
    """
    Reenvia um item da fila de download ou upload, verificando se a pasta ainda existe.

    Fluxo de execução:
    -------------------
    1. Obtém os dados JSON da requisição.
    2. Verifica se o item existe na `QUEUE_CORE`.
    3. Verifica se a pasta principal ainda existe.
    4. Se a pasta temporária (`temp`) existir, mantém `ispre = True`, senão `False`.
    5. Se o status for `"Erro"` ou `"Cancelado"`, redefine para `"Aguardando"`.
    6. Remove detalhes de erro e atualiza a interface via WebSocket.
    7. Adiciona novamente o item na fila (`UP_Q.add()` ou `DW_Q.add()`).
    """

    data = request.get_json()
    item_type = data.get('type')
    item_key = data.get('key')

    if not item_key or not item_type:
        return jsonify({"error": "Parâmetros inválidos"}), 400

    # Obtém o item da fila
    item_data = QUEUE_CORE.get_by_id(item_key)
    if not item_data:
        return jsonify({"error": "Item não encontrado"}), 404

    status = item_data.get('status', {}).get('value')

    # Se o item não estava com erro ou cancelado, não precisa reinserir
    # if status not in [2, 3]:  # 2 = Erro, 3 = Cancelado
    #     return '', 200

    # Obtém os caminhos do upload
    path_main = Path(item_data['chapter']['path']['main'])
    try:
        path_temp = Path(item_data['chapter']['path']['temp'])
    except:
        path_temp = None

    # Verifica se o caminho principal ainda existe
    if not path_main.exists():
        QUEUE_CORE.update_field(
            item_key, 'uploads', {
                "status": {
                    "type": "Erro",
                    "value": 2,
                    "error": "O diretório principal não existe mais."
                }
            }
        )
        socket.emit('check_queue_data')
        return jsonify({"error": "O diretório principal não existe"}), 400

    # Verifica se a pasta temporária existe
    temp_exists = path_temp and path_temp.exists() and path_temp.is_dir()

    # Atualiza os campos antes de reprocessar
    updates = {
        'chapter': {
            'path': {
                'temp': item_data['chapter']['path']['temp'] if temp_exists else None
            }
        },
        'status': {
            "type": "Aguardando",
            "value": 0,
            "skipped": 0,
            "showing": 1,
            "notif": False,
            "detail": None,
            "error": None
        },
        'others': {
            'ispre': temp_exists
        },
        'pre_notif': {
            "status": 0,
            "detail": None,
            "error": None
        }
    }

    # Atualiza o status no banco de filas
    QUEUE_CORE.update_field(item_key, 'uploads', updates)

    # Se a pasta temporária não existir mais, remove-a
    if path_temp and not temp_exists:
        try:
            shutil.rmtree(path_temp)
            socket.emit('calculate_folder')
        except Exception as e:
            print(f"Erro ao remover pasta temporária: {e}")

    # Reinsere na fila de uploads
    if item_type == "upload":
        config = config_core.load_config()
        upload_core = UploadChapters(
            id=item_key,
            data=item_data,
            socket=socket,
            preprocessor=ImagePreprocessor(config),
            config=config_core,
            login=login_core
        )
        UP_Q.add(upload_core)

    elif item_type == "download":
        DW_Q.add(item_data)  # Adiciona de volta na fila de downloads

    # Atualiza a interface
    socket.emit('check_queue_data')

    return '', 200

@app.route('/logs')
def logs():
    translate = session.get('TRANSLATE', {})
    logs_data = {}

    # Garante que a pasta de logs existe
    os.makedirs(log_upload_folder, exist_ok=True)

    # Percorre todas as pastas dentro da pasta de logs (cada uma é um manga_id)
    for manga_id in os.listdir(log_upload_folder):
        project_path = os.path.join(log_upload_folder, manga_id)

        if os.path.isdir(project_path):  # Confirma que é uma pasta
            log_files = [f for f in os.listdir(project_path) if f.endswith(".json") and f not in ("metadata.json", "latest.json")]

            # Ordena os arquivos JSON pelo nome (timestamp no início)
            log_files.sort(reverse=True)  # Do mais recente para o mais antigo

            logs_data[manga_id] = {
                "name": None,  # Será preenchido no primeiro log válido
                "chapters": []
            }

            for log_file in log_files:
                log_path = os.path.join(project_path, log_file)

                try:
                    with open(log_path, "r", encoding="utf-8") as file:
                        log_data = json.load(file)

                        # Definir o nome da obra com base no primeiro log carregado
                        if logs_data[manga_id]["name"] is None:
                            logs_data[manga_id]["name"] = log_data.get("name", "Unknown Title")

                        # Adiciona o log na lista de capítulos
                        logs_data[manga_id]["chapters"].append(log_data)

                except json.JSONDecodeError:
                    print(f"[ERRO] Arquivo corrompido: {log_path}. Ignorando...")

    return render_template('logs.html', translations=translate, logs=logs_data)

@app.route('/select_folder', methods=['GET'])
def select_folder_route():
    folder = check_for_folder()
    if folder:
        return jsonify({'folder': folder})
    else:
        return jsonify({'folder': None}), 400

@app.route('/select_file', methods=['GET'])
def select_file_route():
    file = check_for_file()
    if file:
        return jsonify({'file': file})
    else:
        return jsonify({'file': None}), 400

@app.route('/delete_folder', methods=['POST'])
def delete_folder():
    folder = os.path.join('static', 'covers')

    try:
        if os.path.exists(folder):
            shutil.rmtree(folder)
            return jsonify(success=True)
        else:
            return jsonify(success=False, error="Folder does not exist")
    except Exception as e:
        return jsonify(success=False, error=str(e))

@app.route('/delete_temp_folders', methods=['POST'])
def delete_temp_folders():
    temp_dir = tempfile.gettempdir()

    try:
        for folder_name in os.listdir(temp_dir):
            if folder_name.startswith('MDU_'):  # Verifica o prefixo
                folder_path = os.path.join(temp_dir, folder_name)
                if os.path.isdir(folder_path):  # Confirma que é uma pasta
                    shutil.rmtree(folder_path)  # Remove a pasta e todo o conteúdo
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/edit')
def edit():
    config_data = config_core.load_config()  # Carrega as configurações atuais
    translate = session.get('TRANSLATE', {})
    return render_template('search.html', translations=translate, mode='edit', max_results_page=config_data['max_results_page'])

@app.route('/edit_details/<manga_id>')
def edit_details(manga_id):
    translate = session.get('TRANSLATE', {})
    return render_template('edit_details.html', manga_id=manga_id, translations=translate)

@app.route('/edit_chapter/<chapter_id>', methods=['POST'])
def edit_chapter(chapter_id):
    translate = session.get('TRANSLATE', {})
    data = request.json
    r = CHAPTER.edit_chapter(chapter_id, data)
    if r:
        return jsonify({'success': True}), 200
    return jsonify(success=False, error=translate['not_edited'])

@app.route('/delete_chapter/<chapter_id>', methods=['DELETE'])
def delete_chapter(chapter_id):
    translate = session.get('TRANSLATE', {})
    r = CHAPTER.delete_chapter(chapter_id)
    if r:
        return jsonify({'success': True}), 200
    return jsonify(success=False, error=translate['not_excluded'])

@app.route('/mult_upload')
def mult_upload():
    config_data = config_core.load_config()  # Carrega as configurações atuais
    translate = session.get('TRANSLATE', {})
    is_android = session.get('is_android', False)
    animation_option = config_data.get('loading_animation', 'spinner')
    return render_template('mult_upload.html', translations=translate, is_android=is_android, animation_option=animation_option)

@app.route('/multi-upload-step', methods=['POST'])
def multi_upload_step():
    """
    Processa a listagem de arquivos e pastas em um diretório para upload.

    Esta função recebe um caminho de diretório via requisição POST e retorna uma lista organizada de itens
    (arquivos e pastas) contidos nesse diretório. A função trata de forma diferenciada requisições oriundas de
    dispositivos Android, onde somente arquivos compactados (.zip ou .cbz) contendo imagens são considerados.
    Para demais plataformas, a função lista tanto pastas (se contiverem imagens) quanto arquivos compactados.

    Parâmetros (via request.json):
        - folder_path (str): Caminho para o diretório a ser analisado.

    Sessões:
        - is_android (bool): Indica se a requisição vem de um dispositivo Android. Se True, o valor de 'folder_path'
          é substituído pelo caminho definido na variável global 'android_path'.

    Retorna:
        json: Um objeto JSON contendo:
            - success (bool): True se a operação for bem-sucedida, False em caso de erro.
            - items (list): Lista de dicionários representando os itens encontrados. Cada dicionário possui:
                * name (str): Nome do arquivo ou pasta.
                * path (str): Caminho completo para o arquivo ou pasta.
                * is_directory (bool): True se o item for um diretório, False se for um arquivo.
            - error (str): Mensagem de erro (apresentada apenas se 'success' for False).

    Notas:
        - Em dispositivos Android, apenas arquivos compactados com extensões .zip e .cbz são considerados, desde que contenham imagens.
        - Em outras plataformas, pastas são incluídas somente se contiverem imagens, além dos arquivos compactados.
        - A ordenação dos itens utiliza uma ordenação natural, considerando números presentes nos nomes (por exemplo, "Capítulo 2" vem antes de "Capítulo 10").
        - As funções auxiliares 'contains_images_in_zip' e 'contains_images_in_folder' são utilizadas para verificar se os arquivos ou pastas contêm imagens.
        - Caso o caminho informado não seja válido ou não exista, a função retorna um erro.
    """
    data = request.json
    folder_path = data.get('folder_path')
    
    # Verifica se a requisição vem de um dispositivo Android
    session_is_android = session.get('is_android', False)
    if session_is_android:
        folder_path = android_path  # Certifique-se de que a variável 'android_path' está definida globalmente

    # Verifica se o caminho é válido e se é um diretório
    if not folder_path or not os.path.isdir(folder_path):
        return jsonify({'success': False, 'error': 'Pasta inválida ou inexistente.'})
    
    # Extensões permitidas para arquivos compactados
    allowed_extensions = {'.zip', '.cbz'}
    items = []
    
    try:
        directory_items = natsorted(os.listdir(folder_path))
    except Exception as e:
        return jsonify({'success': False, 'error': f'Erro ao acessar a pasta: {e}'})
    
    for item in directory_items:
        item_path = os.path.join(folder_path, item)
        
        if session_is_android:
            # Em Android, considera apenas arquivos compactados que contenham imagens
            if os.path.isfile(item_path) and os.path.splitext(item)[1].lower() in allowed_extensions and contains_images_in_zip(item_path):
                items.append({
                    'name': item,
                    'path': item_path,
                    'is_directory': False
                })
        else:
            # Em outras plataformas, adiciona pastas (se contiverem imagens) e arquivos compactados
            if os.path.isdir(item_path) and contains_images_in_folder(item_path):
                items.append({
                    'name': item,
                    'path': item_path,
                    'is_directory': True
                })
            elif os.path.isfile(item_path) and os.path.splitext(item)[1].lower() in allowed_extensions and contains_images_in_zip(item_path):
                items.append({
                    'name': item,
                    'path': item_path,
                    'is_directory': False
                })
    
    # Função auxiliar para extrair números e ordenar naturalmente
    def extract_numbers(item_name):
        match = re.search(r'\d+', item_name)
        return int(match.group()) if match else float('inf')
    
    items = natsorted(items, key=lambda x: (extract_numbers(x['name']), x['name']))
    
    return jsonify({'success': True, 'items': items})

@socket.on('mult-upload-send')
def mult_upload_send_socket(data):
    """
    Estrutura de dados:

    data (dict): Dados gerais usados no processo.
        - groups (dict): Informações dos grupos associados.
            - Grupo 1 (key): Nome do grupo.
                - groupName (str): Nome do grupo. Exemplo: "Grupo 1"

                - scans (list): Lista de scans associados ao grupo (pode estar vazio).
                    Cada elemento:

                        - name (str): Nome do scan. Exemplo: "Argos Scan"

                        - id (str): ID único do scan. Exemplo: "73206838-6025-4bcd-a54d-b66e3b26b27"

                - volume (str): Número do volume (pode estar vazio). Exemplo: "1"

                - color (str): Cor associada ao grupo em formato hexadecimal. Exemplo: "#696979"

                - items (list): Lista de capítulos.
                    Cada elemento:

                        - chapter (str): Número do capítulo. Exemplo: "1"

                        - title (str): Título do capítulo (pode estar vazio). Exemplo: ""

                        - filename (str): Nome do arquivo/pasta associado ao capítulo. Exemplo: "1"

        - folder_path (str): Caminho da pasta onde estão os arquivos. Exemplo: "/path/to/folder"
    """

    config = config_core.load_config()
    queues = QUEUE_CORE.load()
    translate = session.get('TRANSLATE', {})
    global progress_data

    progress_data = {
        'percentage': 0,
        'completed': 0,
        'total': 0,
        'is_running': True
    }

    # Receber os dados da requisição
    groups = data.get('groups')  # Grupos recebidos no formato de dicionário
    folderpath = Path(data.get('folder_path'))
    language = data.get('language', 'pt-br')
    long_strip = data.get('long_strip', False)

    if session['is_android']:
        folderpath = android_path

    if not folderpath.exists() or not folderpath.is_dir():
        socket.emit('error_message', {'message': 'Invalid folder path'})
        return

    manga = MANGA.get_manga_id(data['project'])

    if not manga:
        socket.emit('error_message', {'message': translate['manga_not_found']})
        return

    manga_id = manga['id']
    manga_title = manga.get('attributes', {}).get('title', {}).get('en') or \
                  next(iter(manga.get('attributes', {}).get('title', {}).values()), 'Título não encontrado')

    # Inicializa o preprocessor e prepara os argumentos
    preprocessor = ImagePreprocessor(config, long_strip)
    items = natsorted(os.listdir(folderpath))
    
    # Gera IDs únicos para cada item
    unique_ids = [QUEUE_CORE.generate_unique_id(queues) for _ in items]

    # Prepara os argumentos com os IDs já gerados
    args = [(item, folderpath, groups, config, preprocessor, language, SCAN, queues, QUEUE_CORE, manga_id, manga_title, unique_id, translate, socket)
            for item, unique_id in zip(items, unique_ids)]


    total_items = len(items)
    progress_data['total'] = total_items  # Define o total no progresso

    # Usa ThreadPoolExecutor
    result = {}
    max_workers = config.get('queue_operations', 1)  # Valor padrão de 4 workers
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(process_item, arg): arg[0] for arg in args}
        for future in futures:
            try:
                item_result = future.result()
                progress_data['completed'] += 1
                progress_data['percentage'] = int((progress_data['completed'] / progress_data['total']) * 100)

                socket.emit('progress_update', progress_data)

                if 'error' in item_result:
                    socket.emit('error_message', {'message': item_result['error']})
                    continue
                result.update(item_result)
            except Exception as e:
                socket.emit('error_message', {'message': str(e)})

    # Processar os resultados
    progress_data['is_finish'] = True  # Marca como finalizado
    skipped_uploads = []  # Lista de uploads que foram pulados

    # Verificar os itens no result
    filtered_result = {}
    for unique_id, upload_data in result.items():
        if upload_data['status']['skipped'] == 1:
            # Adiciona o upload aos skipped_uploads
            skipped_uploads.append({
                'manga_title': upload_data['project']['manga_title'],
                'language': upload_data['chapter']['language'],
                'group': upload_data['chapter']['groups'],
                'volume': upload_data['chapter']['volume'],
                'chapter': upload_data['chapter']['chapter']
            })
        else:
            # Mantém apenas os resultados que não foram pulados
            filtered_result[unique_id] = upload_data

    # Carregar as filas atuais
    queues = QUEUE_CORE.load()

    # Atualizar `queues` com os resultados que não foram pulados
    queues['uploads'].update(filtered_result)
    
    # Ordenar os uploads com base em manga_title e chapter usando natsorted
    sorted_uploads = dict(
        natsorted(
            filtered_result.items(),
            key=lambda item: (
                item[1]["project"]["manga_title"].lower(),
                item[1]["chapter"]["chapter"]
            )
        )
    )

    # Criar uma lista temporária para armazenar os objetos antes de adicionar à fila
    upload_objects = []

    # Adicionar os resultados ao UP_Q.queue_upload e inicializar os uploads
    for unique_id, upload_data in sorted_uploads.items():
        
        # Criação do objeto UploadChapters
        upload_core = UploadChapters(
            id=unique_id,
            data=upload_data,
            socket=socket,
            preprocessor=preprocessor,
            config=config_core,
            login=login_core
        )

        upload_objects.append(upload_core)  # Armazena na lista temporária

    # Agora adiciona todos os objetos de uma vez na fila
    UP_Q.add(upload_objects)

    # Salvar as atualizações no arquivo
    QUEUE_CORE.save(queues)

    # Atualizar os dados de progresso
    progress_data = {
        'percentage': 0,
        'completed': 0,
        'total': 0,
        'is_running': False
    }

    # Verificar a lista de status de uploads
    socket.emit("check_queue_data")

    # Emitir a mensagem de sucesso com os capítulos que foram pulados
    socket.emit('success_message', {
        'message': translate.get('upload_added_to_queue', 'Upload enviado para fila.'),
        'skipped_uploads': skipped_uploads
    })

@app.route('/create-work', methods=['GET'])
def create_work():
    translate = session.get('TRANSLATE', {})
    return render_template('create_work.html', translations=translate)

@app.route('/create-draft', methods=['GET', 'POST'])
def create_draft():
    config = config_core.load_config()
    
    if request.method == 'POST':
        data = request.get_json()  # Obtém os dados JSON enviados pelo fetch
        if not data:
            return jsonify({'error': 'Nenhum dado recebido'}), 400
        
        if config.get('API_KEY_DETECTLANGUAGE', False):
            result = DetectLanguageAPI.detect_language(data['title'], config.get('API_KEY_DETECTLANGUAGE'))
            if result is None:
                return jsonify({'error': 'Sem API Key.'}), 400
            
            return jsonify(result), 200
        
        return jsonify({'error': 'API de detecção de idioma desativada.'}), 400
    
    translate = session.get('TRANSLATE', {})
    return render_template(
        'create_draft.html',
        translations=translate,
        t_after_save=translate['create_draft']['after_save'],
        t_menu=translate['create_draft']['menu'],
        t_roles=translate['create_draft']['roles'],
        t_container=translate['create_draft']['container']
    )

@app.route('/proxy-image')
def proxy_image():
    image_url = request.args.get('url')
    if not image_url:
        return jsonify({"error": "URL da imagem não fornecida"}), 400
    
    response = requests.get(image_url, stream=True)
    if response.status_code != 200:
        return jsonify({"error": "Falha ao baixar imagem"}), 500

    return send_file(BytesIO(response.content), mimetype=response.headers['Content-Type'])

@app.route('/api/upload/cover', methods=['POST'])
def upload_cover():
    if 'file' not in request.files:
        return jsonify({"error": "Nenhum arquivo foi enviado"}), 400

    file = request.files['file']  # Obtém o arquivo
    volume = request.form.get('volume', '')
    description = request.form.get('description', '')
    locale = request.form.get('locale', '')
    isMain = request.form.get('isMain', 'false').lower() in ['true', '1']
    workId = request.form.get('workId', '')

    if not file:
        return jsonify({"error": "Nenhum arquivo foi enviado"}), 400

    # Sanitiza o nome do arquivo
    filename = secure_filename(file.filename)
    
    # Salva o arquivo em um arquivo temporário
    with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{filename}") as tmp:
        file.save(tmp)
        tmp_path = tmp.name

    # Abre o arquivo temporário para leitura em binário e passa para a função de upload
    with open(tmp_path, "rb") as f:
        result = COVER.upload_cover(f, volume, description, locale, workId)

    # Remove o arquivo temporário após o uso
    os.remove(tmp_path)

    if result.get('data', False):
        if isMain:
            r = MANGA.update_draft(workId, {'primaryCover': result['data']['id']})
            print(r)
        socket.emit('create_draft_response_cover', workId)
        return jsonify({"message": "Upload bem-sucedido"}), 200

    return jsonify({"error": "Falha ao fazer upload da capa"}), 500




def setup_web():
    webbrowser.open('http://localhost:5007')
    app.run(host='localhost', port=5007, debug=False)

if __name__ == '__main__':
    app_folder = os.getcwd()
    webbrowser.open('http://localhost:5007')
    socket.run(app, host='localhost', port=5007, debug=True)
