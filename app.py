import src.core.Utils.Module.check as ck

import os
import re
import json
import shutil
import markdown
import requests
import tempfile
import webbrowser
from pathlib import Path
from functools import wraps
from markupsafe import Markup
from natsort import natsorted
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone, timedelta
from flask import Flask, render_template, request, flash, redirect, url_for, jsonify, session
from flask_session import Session

import threading

os.system('cls')

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

### Others
from src.core.Utils.Others.extract_archive import extract_archive
from src.core.Utils.Others.folders import token_file, log_upload_file
from src.core.Utils.Others.select_file_check import check_for_file
from src.core.Utils.Others.select_folder_check import check_for_folder
from src.core.Utils.Others.get_covers import get_folder_size
from src.core.Utils.Others.get_temp import calculate_temp_folders_size
from src.core.Utils.Others.process_item import process_item
from src.core.Utils.Others.check_path import check_path
from src.core.Utils.Others.check_image import contains_images_in_folder, contains_images_in_zip

### Upload
from src.core.Utils.Upload.core import UploadChapters
from src.core.Utils.Upload.upload import UploadQueue

SmartStitch_enable = ck.check_smartstitch_compatible()


login_core = LoginAuth()
config_core = ConfigFile(SmartStitch_enable)

DW_Q = DownloadQueue()
UP_Q = UploadQueue()

AUTHOR = GetAuthor(config_core)
CHAPTER = GetChapter(login_core, config_core)
COVER = GetCover(config_core)
MANGA = GetManga(config_core, AUTHOR, COVER)
USER_ME = UserMe(login_core, config_core)
SCAN = GetScan(config_core)

app = Flask(__name__)
# Configuração do Flask-Session
app.config['SESSION_TYPE'] = 'filesystem'  # Armazena as sessões no sistema de arquivos local
app.config['SESSION_PERMANENT'] = True
app.config['SESSION_FILE_DIR'] = './flask_session'  # Diretório onde os dados serão armazenados
Session(app)
app.secret_key = 'sua_chave_secreta'

welcome_seen = False
lang = None
TRANSLATE = None

android_path = Path('/storage/emulated/0/Download/Mangadex Upload (uploads)')
temp_folder = tempfile.gettempdir()
app_folder = check_path()

print('android', android_path, '\n')
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
    # Verifica o idioma do usuário e carrega traduções
    user_language = request.headers.get('Accept-Language', 'en').split(',')[0].lower()
    if 'lang' not in session or session['lang'] != user_language:
        session['lang'] = user_language
        default_language = 'en'
        language_file = os.path.join(app_folder, 'src', 'locale', f'{user_language}.json')
        try:
            with open(language_file, 'r', encoding='utf-8') as file:
                session['TRANSLATE'] = json.load(file)
        except FileNotFoundError:
            fallback_file = os.path.join(app_folder, 'src', 'locale', f'{default_language}.json')
            with open(fallback_file, 'r', encoding='utf-8') as file:
                session['TRANSLATE'] = json.load(file)
            session['lang'] = default_language

    # Verifica se o usuário está logado
    public_routes = ['login', 'static']  # Adicione outras rotas públicas aqui
    if request.endpoint not in public_routes and not session.get('access_token'):
        flash("Você precisa estar logado para acessar esta página.")
        return redirect(url_for('login'))

    # Verifica o agente do usuário
    user_agent = request.headers.get('User-Agent', '').lower()
    session['is_android'] = 'android' in user_agent
    if session['is_android'] and not os.path.exists(android_path):
        os.makedirs(android_path, exist_ok=True)


@app.route('/api/search', methods=['GET'])
def api_search():
    config = config_core.load_config()
    
    query = request.args.get('title')
    page = int(request.args.get('page', 1))
    limit = 10  # Limite de resultados por página
    offset = (page - 1) * limit
    max_result = config['max_results']  # Máximo de resultados permitido

    if query:
        data = MANGA.get_manga(query, max_result, 0)  # Busca até o máximo de resultados
        if data:
            # Ajusta o total ao máximo permitido
            total_results = min(data['total'], max_result)
            return jsonify({
                'mangas': data['results'][:total_results],  # Limita ao máximo permitido
                'totalResults': total_results,
                'limit': limit
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
        download_folder = request.form.get('download_folder')
        download_folder_scheme = request.form.get('download_folder_scheme')
        cover_image_quality = request.form.get('cover_image_quality')
        upload_on_error = request.form.get('upload_on_error') == 'true'
        preprocess_images = request.form.get('preprocess_images') == 'true'
        cutting_tool = request.form.get('cutting_tool', 'Pillow')
        output_file_type = request.form.get('output_file_type', 'JPG')
        output_image_quality = int(request.form.get('output_image_quality'))
        queue_operations = int(request.form.get('queue_operations'))
        image_operations = int(request.form.get('image_operations'))

        if not SmartStitch_enable:
            cutting_tool = 'Pillow'

        # Limites para as configurações numéricas
        upload = min(max(upload, 1), 10)
        retry = min(max(retry, 1), 3)
        max_results = min(max(max_results, 1), 100)
        queue_operations = min(max(queue_operations, 1), 10)
        image_operations = min(max(image_operations, 1), 10)
        output_image_quality = min(max(output_image_quality, 0), 100)

        # Atualiza os dados de configuração
        config_data.update({
            'upload': upload,
            'retry': retry,
            'log': log,
            'api_url': api_url,
            'auth_url': auth_url,
            'max_results': max_results,
            'download_folder': download_folder,
            'download_folder_scheme': download_folder_scheme,
            'cover_image_quality': cover_image_quality,
            'upload_on_error': upload_on_error,
            'preprocess_images': preprocess_images,
            'cutting_tool': cutting_tool,
            'output_file_type': output_file_type,
            'output_image_quality': output_image_quality,
            'queue_operations': queue_operations,
            'image_operations': image_operations
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
        temp_folders_size=temp_folders_size,
        SmartStitch_enable=SmartStitch_enable
    )

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
            flash(translate.get('fill_all_fields', 'Por favor, preencha todos os campos.'))
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
                    flash(translate.get('missing_tokens', 'O servidor não retornou os tokens necessários.'))
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
                flash(translate.get('unauthorized', 'Credenciais inválidas. Por favor, tente novamente.'))
            elif r.status_code == 403:
                flash(translate.get('forbidden', 'Acesso negado. Verifique sua conta e permissões.'))
            elif r.status_code == 500:
                flash(translate.get('server_error', 'Erro no servidor. Tente novamente mais tarde.'))
            else:
                flash(translate.get('unexpected_error', f'Erro inesperado ({r.status_code}): {r.text}'))

        except requests.exceptions.Timeout:
            flash(translate.get('timeout', 'O servidor demorou muito para responder. Tente novamente mais tarde.'))
        except requests.exceptions.RequestException as e:
            flash(translate.get('connection_error', f'Erro de conexão: {str(e)}'))

    return render_template('login.html', translations=translate)

@app.route('/home', methods=['GET', 'POST'])
def home():
    global welcome_seen
    
    translate = session.get('TRANSLATE', {})
    
    notifications = []
    if update.new_update:
        # Substitui o placeholder {version} com o valor real de rmver_
        notifications.append(translate.get('new_update', 'Nova atualização disponível! v{version}').format(version=update.rmver_))
    
    if not welcome_seen:
        user = USER_ME.get_user_me()
        
        if user is None:
            return redirect(url_for('login'))
        
        # Substitui o placeholder {username} com o nome real do usuário
        notifications.append(translate.get('welcome_message', "Bem-vindo ao MangaDex Uploader, {username}!").format(username=user['attributes']['username']))
        
        if not update.new_update:
            # Substitui o placeholder {version} com o valor real de lcver_
            notifications.append(translate.get('up_to_date', 'Você está na versão mais recente! v{version}').format(version=update.lcver_))
        
        welcome_seen = True
    
    return render_template(
        'home.html',
        notifications=notifications,
        translations=translate
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
    translate = session.get('TRANSLATE', {})
    return render_template('search.html', translations=translate, mode='download')

@app.route('/details/<manga_id>')
def details(manga_id):
    translate = session.get('TRANSLATE', {})
    return render_template('details.html', manga_id=manga_id, translations=translate)

@app.route('/api/download_chapters', methods=['POST'])
def download_chapters():
    config_data = config_core.load_config()
    
    # Obtém os dados enviados do lado do cliente
    chapters = request.json.get('chapters', [])
    
    # Adiciona os capítulos à fila de download
    for chapter in chapters:
        chapter_id = chapter['chapterId']
        manga_title = chapter['mangaTitle']
        translated = chapter['translatedLanguage']
        chapter_ = chapter['chapterNumber']
        volume = chapter['volume']
        group = chapter['groups']
        
        group_names = []

        for gp_ in group:
            r = SCAN.get_scan(gp_)
            if r:
                group_name = r['attributes']['name']
                if group_name not in group_names:  # Evita adicionar nomes repetidos
                    group_names.append(group_name)

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

        
        download_core = DownloadChapters(
            manga_title=manga_title, 
            translated=translated, 
            chapter=chapter_, 
            chapter_id=chapter_id, 
            path=path, 
            status=0, 
            queue=config_data['upload'], 
            api_url=config_data['api_url']
        )
        
        DW_Q.queue_download[f'{manga_title} - {translated} - {chapter_}'] = {
            'chapter_id': chapter_id,
            'title': manga_title,
            'translated': translated,
            'chapter': chapter_,
            'volume': volume,
            'path': path,
            'status': 'Aguardando',
            'error': None
        }
        
        DW_Q.add(
            download_core
        )
    
    return jsonify({'status': 'success', 'message': 'Capítulos enviados para download em segundo plano.'})

@app.route('/upload', methods=['GET'])
def upload():
    translate = session.get('TRANSLATE', {})
    return render_template('upload.html', min_datetime=min_datetime, max_datetime=max_datetime, translations=translate)

@app.route('/search_projects', methods=['GET'])
def search_projects():
    results = MANGA.search_manga(request.args.get('query', ''))
    return jsonify(results=results)

@app.route('/search_groups', methods=['GET'])
def search_groups():
    results = SCAN.search_scan(request.args.get('query', ''))
    return jsonify(results=results)

@app.route('/submit', methods=['POST'])
def submit():
    config = config_core.load_config()
    translate = session.get('TRANSLATE', {})
    
    dir_tmp = None
    ispre = False
    
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
                
                # Atualiza o caminho para o diretório temporário
                path = Path(temp_dir)
                dir_tmp = path
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

            # Atualiza o caminho para o diretório temporário
            path = Path(temp_dir)
            dir_tmp = path

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

        queues_list = UP_Q.queue_upload

        # Itera sobre os uploads na fila
        for item in queues_list.values():
            if (
                item['manga_id'] == manga['id'] and
                item['language'] == data['language'] and
                item['groups'] == groups and
                item['volume'] == volume and
                item['chapter'] == chapter and
                item['path'] == path and
                item['oneshot'] == data['singleChapter']
            ):
                return jsonify(success=False, message=translate.get('duplicate_upload', 'Este upload já está na fila.'))
                
        upload_core = UploadChapters(
            manga_id=manga['id'],
            manga_title=manga['attributes']['title']['en'],
            title=title,
            language=data['language'],
            groups=groups,
            volume=volume,
            chapter=chapter,
            path=path,
            datetime=publish_date_str,
            oneshot=data['singleChapter'],
            status=0,
            dir_tmp=dir_tmp,
            config=config_core,
            login=login_core,
            preprocessor=preprocessor,
            ispre=ispre
        )
        
        UP_Q.queue_upload[f"{manga['attributes']['title']['en']} - {data['language']} - {chapter}"] = {
            'manga_id': manga['id'],
            'manga_title': manga['attributes']['title']['en'],
            'title': title,
            'language': data['language'],
            'groups': groups,
            'volume': volume,
            'chapter': chapter,
            'path': path,
            'datetime': publish_date_str,
            'oneshot': data['singleChapter'],
            'status': translate.get('waiting', 'Aguardando'),
            'notif': False,
            'error': None
        }
        
        UP_Q.add(upload_core)

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
        new_update=update.new_update,
        translations=translate
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

    def normalize_chapter(chapter):
        """Normaliza o capítulo para ordenação natural."""
        import re
        if not chapter:
            return float('inf')  # Capítulos ausentes vão para o final
        return [int(part) if part.isdigit() else part.lower() for part in re.split(r'(\d+)', chapter)]

    # Ordenar a fila de uploads
    sorted_queue_upload = natsorted(
        UP_Q.queue_upload.items(),
        key=lambda item: (
            item[1].get('manga_title', '').lower(),  # Ordena por título em ordem alfabética
            normalize_chapter(item[1].get('chapter'))  # Ordena capítulos naturalmente
        )
    )

    # Ordenar a fila de downloads (se aplicável)
    sorted_queue_download = natsorted(
        DW_Q.queue_download.items(),
        key=lambda item: (
            item[1].get('manga_title', '').lower(),  # Ordena por título em ordem alfabética
            normalize_chapter(item[1].get('chapter'))  # Ordena capítulos naturalmente
        )
    )

    return render_template(
        'queue.html',
        translations=translate,
        queue_download=sorted_queue_download,
        queue_upload=sorted_queue_upload
    )

@app.route('/get_queue_data', methods=['POST'])
def get_queue_data():
    def normalize_chapter(chapter):
        """Normaliza o capítulo para ordenação natural."""
        if not chapter:
            return float('inf')  # Capítulos ausentes vão para o final
        return [int(part) if part.isdigit() else part.lower() for part in re.split(r'(\d+)', chapter)]

    def serialize_path(data):
        """Converte todos os objetos WindowsPath para string."""
        for key, value in data.items():
            if isinstance(value, dict):
                data[key] = serialize_path(value)  # Chamado recursivamente para dicionários
            elif isinstance(value, Path):  # Converte Path para string
                data[key] = str(value)
        return data

    # Ordenar a fila de uploads
    sorted_queue_upload = natsorted(
        UP_Q.queue_upload.items(),
        key=lambda item: (
            item[1].get('manga_title', '').lower(),  # Ordena por título em ordem alfabética
            normalize_chapter(item[1].get('chapter'))  # Ordena capítulos naturalmente
        )
    )

    # Ordenar a fila de downloads (se aplicável)
    sorted_queue_download = natsorted(
        DW_Q.queue_download.items(),
        key=lambda item: (
            item[1].get('manga_title', '').lower(),  # Ordena por título em ordem alfabética
            normalize_chapter(item[1].get('chapter'))  # Ordena capítulos naturalmente
        )
    )

    # Converte para listas ordenadas com chaves explícitas
    sorted_queue_upload = [{"key": k, **serialize_path(v)} for k, v in sorted_queue_upload]
    sorted_queue_download = [{"key": k, **serialize_path(v)} for k, v in sorted_queue_download]

    return jsonify(queue_download=sorted_queue_download, queue_upload=sorted_queue_upload)

@app.route('/delete_item', methods=['POST'])
def delete_item():
    data = request.get_json()
    item_type = data.get('type')
    item_key = data.get('key')
    
    # Remove da fila de download
    if item_type == 'download':
        for item in list(DW_Q.get()):
            if item_key == f"{item.manga_title} - {item.translated} - {item.chapter}":
                item.status_cancel()
                DW_Q.pop(item_key)
                return '', 200
        else:
            if item_key in DW_Q.queue_download:
                DW_Q.pop(item_key)
                return '', 200
    
    # Remove da fila de upload
    elif item_type == 'upload':
        for item in list(UP_Q.get()):
            if item_key == f"{item.manga_title} - {item.language} - {item.chapter}":
                item.status_cancel()
                UP_Q.pop(item_key)
                return '', 200
        else:
            if item_key in UP_Q.queue_upload:
                UP_Q.pop(item_key)
                return '', 200
    
    return '', 200

@app.route('/logs')
def logs():
    translate = session.get('TRANSLATE', {})
    
    if os.path.exists(log_upload_file):
        with open(log_upload_file, "r", encoding="utf-8") as file:
            logs = json.load(file)
    else:
        logs = {}

    return render_template('logs.html', translations=translate, logs=logs)

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
    translate = session.get('TRANSLATE', {})
    return render_template('search.html', translations=translate, mode='edit')

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
    translate = session.get('TRANSLATE', {})
    is_android = session.get('is_android', False)
    return render_template('mult_upload.html', translations=translate, is_android=is_android)

@app.route('/multi-upload-step', methods=['POST'])
def multi_upload_step():
    data = request.json
    folder_path = data.get('folder_path')
    
    # Substituir o caminho para Android
    if session.get('is_android', False):  # Verifica explicitamente se a sessão é Android
        folder_path = android_path

    # Verificar se o caminho é válido
    if not folder_path or not os.path.exists(folder_path):
        return jsonify({'success': False, 'error': 'Pasta inválida ou inexistente.'})

    # Extensões permitidas para compactados
    allowed_extensions = {'.zip', '.cbz'}

    # Listar arquivos e pastas no diretório
    items = []
    for item in natsorted(os.listdir(folder_path)):
        item_path = os.path.join(folder_path, item)

        # Lógica para dispositivos Android: somente arquivos compactados
        if session.get('is_android', False):
            # Verifica apenas arquivos .zip ou .cbz
            if os.path.splitext(item)[1].lower() in allowed_extensions and contains_images_in_zip(item_path):
                items.append({
                    'name': item,
                    'path': item_path,
                    'is_directory': False
                })
        else:
            # Para outras plataformas, permite pastas e arquivos compactados
            if os.path.isdir(item_path) and contains_images_in_folder(item_path):
                items.append({
                    'name': item,
                    'path': item_path,
                    'is_directory': True
                })
            elif os.path.splitext(item)[1].lower() in allowed_extensions and contains_images_in_zip(item_path):
                items.append({
                    'name': item,
                    'path': item_path,
                    'is_directory': False
                })

    return jsonify({'success': True, 'items': items})

@app.route('/mult-upload-send', methods=['POST'])
def multi_upload_send():
    config = config_core.load_config()
    translate = session.get('TRANSLATE', {})
    
    # Receber os dados da requisição
    data = request.json
    groups = data.get('groups')  # Grupos recebidos no formato de dicionário
    folderpath = Path(data.get('folder_path'))
    language = data.get('language', 'pt-br')

    if not folderpath.exists() or not folderpath.is_dir():
        return jsonify({'error': 'Invalid folder path'}), 400

    manga = MANGA.get_manga_id(data['project'])
    
    if not manga:
        return jsonify(success=False, message=translate['manga_not_found']), 404

    # Inicializa o preprocessor e prepara os argumentos
    preprocessor = ImagePreprocessor(config)
    items = natsorted(os.listdir(folderpath))
    args = [(item, folderpath, groups, config, preprocessor, language, SCAN) for item in items]

    # Usa ThreadPoolExecutor
    result = {}
    max_workers = config.get('queue_operations', 1)  # Valor padrão de 4 workers
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(process_item, arg): arg[0] for arg in args}
        for future in futures:
            try:
                item_result = future.result()
                if 'error' in item_result:
                    return jsonify(success=False, message=item_result['error']), 400
                result.update(item_result)
            except Exception as e:
                return jsonify(success=False, message=str(e)), 400

    skipped_uploads = []  # Lista de uploads que já existem

    for x, chapters in result.items():
        for chapter in chapters:
            # Flag para verificar se o upload já existe
            upload_exists = False

            queues_list = UP_Q.queue_upload

            # Itera sobre os uploads na fila
            for item in queues_list.values():
                if (
                    item['manga_id'] == manga['id'] and
                    item['language'] == data['language'] and
                    item['groups'] == chapter['group'] and
                    item['volume'] == chapter['volume'] and
                    item['chapter'] == chapter['chapter']
                ):
                    # Upload já existe na fila
                    upload_exists = True
                    skipped_uploads.append({
                        'title': manga['attributes']['title']['en'],
                        'language': data['language'],
                        'group': chapter['group'],
                        'volume': chapter['volume'],
                        'chapter': chapter['chapter']
                    })
                    break

            # Se o upload já existe, pule para o próximo capítulo
            if upload_exists:
                if chapter['ispre']:
                    shutil.rmtree(chapter['path'])
                continue

            # Criar o objeto UploadChapters
            upload_core = UploadChapters(
                manga_id=manga['id'],
                manga_title=manga['attributes']['title']['en'],
                title=chapter.get('title', ''),
                language=data['language'],
                groups=chapter['group'],
                volume=chapter['volume'],
                chapter=chapter['chapter'],
                path=chapter['path'],
                datetime=None,
                oneshot=None,
                status=0,
                dir_tmp=chapter['path'],
                config=config_core,
                login=login_core,
                preprocessor=preprocessor,
                ispre=chapter.get('ispre', False)
            )
            
            # Adiciona à fila e atualiza o dicionário de status
            UP_Q.queue_upload[f"{manga['attributes']['title']['en']} - {data['language']} - {chapter['chapter']}"] = {
                'manga_id': manga['id'],
                'manga_title': manga['attributes']['title']['en'],
                'title': chapter.get('title', ''),
                'language': data['language'],
                'groups': chapter['group'],
                'volume': chapter['volume'],
                'chapter': chapter['chapter'],
                'path': chapter['path'],
                'datetime': None,
                'oneshot': None,
                'status': translate.get('waiting', 'Aguardando'),
                'notif': False,
                'error': None
            }

            UP_Q.add(upload_core)

    # Retorna a resposta incluindo os capítulos que foram pulados
    return jsonify(
        success=True, 
        message=translate.get('upload_added_to_queue', 'Upload enviado para fila.'),
        skipped_uploads=skipped_uploads  # Capítulos não enviados
    )

@app.route('/get_notifications', methods=['GET'])
def get_notifications():
    # Armazena os capítulos que precisam ser notificados
    notifications = []
    
    # Itera sobre os capítulos no UP_Q.queue_upload
    for key, value in UP_Q.queue_upload.items():
        # Verifica se a notificação já foi enviada e se o status é "success" ou "error"
        if not value['notif'] and value['status'] in ['Concluído', 'Erro']:
            notifications.append({
                'key': key,
                'status': value['status'],
                'error': value['error'],
                'manga_title': value['manga_title'],
                'chapter': value['chapter']
            })
            # Marca como notificado
            value['notif'] = True

    return jsonify({'success': True, 'notifications': notifications})


def setup_web():
    webbrowser.open('http://localhost:5007')
    app.run(host='localhost', port=5007, debug=False)

if __name__ == '__main__':
    app_folder = os.getcwd()
    webbrowser.open('http://localhost:5007')
    app.run(host='localhost', port=5007, debug=True)
