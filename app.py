import os
import markdown
import requests
import tempfile
import webbrowser
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile
from markupsafe import Markup
from packaging import version
from datetime import datetime, timezone, timedelta
from flask import Flask, render_template, request, flash, redirect, url_for, jsonify

from __init__ import __version__

from src.folders import token_file
from src.config import ConfigFile
from src.login.login import LoginAuth

from src.download import DownloadChapters
from src.upload import UploadChapters

import threading
import queue

os.system('cls')

app = Flask(__name__)
app.secret_key = 'sua_chave_secreta'

welcome_seen = False
check_update = False
new_update = False

namespace = "OneDefauter"
repo = f"https://api.github.com/repos/{namespace}/MangaDex-Upload/releases/latest"

temp_folder = tempfile.gettempdir()
app_folder = os.path.join(temp_folder, "MangaDex Upload (APP)")

# Cria a fila de download
DOWNLOAD_QUEUE = queue.Queue()
UPLOAD_QUEUE = queue.Queue()
current_process_download = None
current_process_upload = None
queue_download = {}
queue_upload = {}

config_core = ConfigFile()
login_core = LoginAuth()

def download_worker():
    global current_process_download
    while True:
        download_core = DOWNLOAD_QUEUE.get()
        if download_core is None:
            break
        current_process_download = download_core
        queue_download[f'{download_core.manga_title} - {download_core.translated} - {download_core.chapter}']['status'] = 'Processando'
        try:
            download_core.download_chapter()
            queue_download[f'{download_core.manga_title} - {download_core.translated} - {download_core.chapter}']['status'] = 'Concluído'
        except Exception as e:
            queue_download[f'{download_core.manga_title} - {download_core.translated} - {download_core.chapter}']['status'] = 'Erro'
            queue_download[f'{download_core.manga_title} - {download_core.translated} - {download_core.chapter}']['error'] = str(e)
            print(f"Erro ao baixar capítulo {download_core}: {e}")
        current_process_download = None
        DOWNLOAD_QUEUE.task_done()

def upload_worker():
    global current_process_upload
    while True:
        upload_core = UPLOAD_QUEUE.get()
        if upload_core is None:
            break
        current_process_upload = upload_core
        queue_download[f'{upload_core.manga_title} - {upload_core.language} - {upload_core.chapter}']['status'] = 'Processando'
        try:
            upload_core.setup()
            queue_download[f'{upload_core.manga_title} - {upload_core.language} - {upload_core.chapter}']['status'] = 'Concluído'
        except Exception as e:
            queue_download[f'{upload_core.manga_title} - {upload_core.language} - {upload_core.chapter}']['status'] = 'Erro'
            queue_download[f'{upload_core.manga_title} - {upload_core.language} - {upload_core.chapter}']['error'] = str(e)
            print(f"Erro ao enviar capítulo {upload_core}: {e}")
        current_process_upload = None
        UPLOAD_QUEUE.task_done()


threading.Thread(target=download_worker, daemon=True).start()
threading.Thread(target=upload_worker, daemon=True).start()

min_datetime = datetime.now().strftime('%Y-%m-%dT%H:%M')
max_datetime = (datetime.now() + timedelta(weeks=2)).strftime('%Y-%m-%dT%H:%M')

def check_update_only():
    global new_update
    
    local_version = version.parse(__version__)
    remote_release = requests.get(repo)
    
    if remote_release.ok:
        release = remote_release.json()
        remote_version = version.parse(release["tag_name"])
    
    if remote_version > local_version:
        new_update = True
        print(f"Nova atualização disponível: {release['tag_name']}")

# Função para garantir que o diretório de imagens exista
def ensure_cover_directory():
    cover_dir = os.path.join('static', 'covers')
    if not os.path.exists(cover_dir):
        os.makedirs(cover_dir)
    return cover_dir

# Função para buscar mangás usando a API MangaDex do lado do servidor
def search_manga(query, limit=12, offset=0):
    url = "https://api.mangadex.org/manga"
    params = {"title": query, "limit": limit, "offset": offset}
    response = requests.get(url, params=params)
    
    if response.status_code == 200:
        response_data = response.json()
        mangas = response_data.get('data', [])
        total_results = response_data.get('total', 0)  # Obtenha o total de resultados da resposta

        results = []
        cover_dir = ensure_cover_directory()

        for manga in mangas:
            manga_id = manga['id']
            title = manga['attributes']['title'].get('en', 'Título não disponível')
            cover_id = next((rel['id'] for rel in manga['relationships'] if rel['type'] == 'cover_art'), None)

            if cover_id:
                cover_response = requests.get(f"https://api.mangadex.org/cover/{cover_id}")
                if cover_response.status_code == 200:
                    cover_data = cover_response.json().get('data', {})
                    file_name = cover_data['attributes'].get('fileName', '')
                    cover_url = f"https://uploads.mangadex.org/covers/{manga_id}/{file_name}.256.jpg"
                    
                    local_cover_path = os.path.join(cover_dir, f"{manga_id}.jpg")

                    if not os.path.exists(local_cover_path):
                        img_data = requests.get(cover_url).content
                        with open(local_cover_path, 'wb') as img_file:
                            img_file.write(img_data)

                    cover_url = f"/static/covers/{manga_id}.jpg"
                else:
                    cover_url = '/static/covers/placeholder.jpg'
            else:
                cover_url = '/static/covers/placeholder.jpg'

            results.append({
                'id': manga_id,
                'title': title,
                'cover_url': cover_url
            })

        return {
            'results': results,
            'total': total_results
        }
    else:
        return {
            'results': [],
            'total': 0
        }

def me():
    data = login_core.load_data()
    config = config_core.load_config()
    
    access_token = login_core.refresh_access_token(refresh_token=data['refresh_token'], client_id=data['client_id'], client_secret=data['client_secret'])
    
    if data:
        r = requests.get(
            f"{config['api_url']}/user/me",
            headers={
                "Authorization": f"Bearer {access_token}"
            }
        )
        
        if r.ok:
            return r.json()['data']

@app.route('/api/search', methods=['GET'])
def api_search():
    config = config_core.load_config()
    
    query = request.args.get('title')
    page = int(request.args.get('page', 1))
    limit = 10  # Limite de resultados por página
    offset = (page - 1) * limit
    max_result = config['max_results']  # Máximo de resultados permitido

    if query:
        data = search_manga(query, max_result, 0)  # Busca até o máximo de resultados
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
    config = config_core.load_config()
    
    manga_response = requests.get(f"{config['api_url']}/manga/{manga_id}")
    if manga_response.status_code == 200:
        manga_data = manga_response.json()['data']
        
        # Caminho para a capa local salva
        local_cover_path = f"/static/covers/{manga_id}.jpg"
        
        # Obter a descrição em português, ou usar inglês como fallback
        description = manga_data['attributes']['description'].get('pt-br') or \
                      manga_data['attributes']['description'].get('en', 'Sem descrição disponível')
        
        # Função auxiliar para obter o nome do autor ou artista
        def get_person_name(person_id):
            person_response = requests.get(f"{config['api_url']}/author/{person_id}")
            if person_response.status_code == 200:
                return person_response.json()['data']['attributes']['name']
            return 'Desconhecido'
        
        # Obter nome do autor
        author_id = next((rel['id'] for rel in manga_data['relationships'] if rel['type'] == 'author'), None)
        author_name = get_person_name(author_id) if author_id else 'Desconhecido'
        
        # Obter nome do artista
        artist_id = next((rel['id'] for rel in manga_data['relationships'] if rel['type'] == 'artist'), None)
        artist_name = get_person_name(artist_id) if artist_id else 'Desconhecido'
        
        manga_details = {
            'title': manga_data['attributes']['title'].get('en', 'Título não disponível'),
            'cover_url': local_cover_path,  # Usa a capa local
            'author': author_name,
            'artist': artist_name,
            'status': manga_data['attributes']['status'],
            'link': f"https://mangadex.org/title/{manga_id}",
            'description': description,
            'tags': [tag['attributes']['name']['en'] for tag in manga_data['attributes']['tags']],
            'availableTranslatedLanguages': manga_data['attributes']['availableTranslatedLanguages']
        }
        return jsonify(manga_details)
    return jsonify({"error": "Erro ao buscar detalhes do mangá."}), 500

@app.route('/api/manga/<manga_id>/aggregate', methods=['GET'])
def get_manga_aggregate(manga_id):
    config = config_core.load_config()
    
    language = request.args.get('translatedLanguage')
    response = requests.get(f"{config['api_url']}/manga/{manga_id}/aggregate?translatedLanguage[]={language}")
    if response.status_code == 200:
        data = response.json()['volumes']
        sorted_chapters = sort_chapters(data)
        return jsonify({'chapters': sorted_chapters})
    return jsonify({"error": "Erro ao buscar capítulos do mangá."}), 500

def sort_chapters(volumes):
    # Ordena volumes e capítulos
    sorted_volumes = {}
    for volume, volume_data in sorted(volumes.items(), key=lambda x: float(x[0]) if x[0].replace('.', '', 1).isdigit() else float('inf')):
        sorted_chapters = dict(sorted(volume_data['chapters'].items(), key=lambda x: float(x[0]) if x[0].replace('.', '', 1).isdigit() else float('inf')))
        sorted_volumes[volume] = {'chapters': sorted_chapters}
    return sorted_volumes

@app.route('/config', methods=['GET', 'POST'])
def config():
    config_data = config_core.load_config()
    if request.method == 'POST':
        # Obtém os valores do formulário
        upload = int(request.form.get('upload'))
        retry = int(request.form.get('retry'))
        log = request.form.get('log') == 'true'
        api_url = request.form.get('api_url')
        auth_url = request.form.get('auth_url')
        max_results = int(request.form.get('max_results'))
        download_folder = request.form.get('download_folder')  # Obtém o valor da pasta de downloads

        # Atualiza os dados de configuração
        config_data.update({
            'upload': upload,
            'retry': retry,
            'log': log,
            'api_url': api_url,
            'auth_url': auth_url,
            'max_results': max_results,
            'download_folder': download_folder  # Atualiza a configuração com o novo campo
        })

        # Salva a configuração
        config_core.save_config(config_data)
        flash('Configurações salvas com sucesso!')

    return render_template('config.html', config=config_data, default_config=config_core.default_config)

@app.route('/restore_defaults', methods=['POST'])
def restore_defaults():
    config_core.save_config(config_core.default_config)
    flash('Configurações restauradas para os padrões!')
    return redirect(url_for('config'))

@app.route('/', methods=['GET', 'POST'])
def login():
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
            return redirect(url_for('home'))

    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        client_id = request.form.get('client_id')
        client_secret = request.form.get('client_secret')
        
        if username and password and client_id and client_secret:
            creds = {
                'grant_type': 'password',
                'username': username,
                'password': password,
                'client_id': client_id,
                'client_secret': client_secret
            }
            # Envia a requisição para obter os tokens
            r = requests.post(
                config['auth_url'],
                data=creds
            )
            if r.status_code == 200:
                r_json = r.json()
                access_token = r_json.get("access_token")
                refresh_token = r_json.get("refresh_token")

                # Salva os dados criptografados
                login_core.save_data({
                    'access_token': access_token,
                    'refresh_token': refresh_token,
                    'client_id': client_id,
                    'client_secret': client_secret
                })

                return redirect(url_for('home'))
            else:
                flash('Falha no login, verifique suas credenciais.')
        else:
            flash('Por favor, preencha todos os campos.')
    
    return render_template('login.html')

@app.route('/home')
def home():
    global welcome_seen
    global check_update
    
    notifications = []
    if not check_update:
        check_update_only()
        check_update = True
    
    if new_update:
        notifications.append('Nova atualização disponível!')
    
    if not welcome_seen:
        user = me()
        notifications.append(f'Bem-vindo ao MangaDex Uploader, {user['attributes']['username']}!')
        welcome_seen = True
    
    return render_template('home.html', notifications=notifications)

@app.route('/logout')
def logout():
    # Remove o arquivo de tokens para efetuar o logout
    if os.path.exists(token_file):
        os.remove(token_file)
        
    flash('Você foi desconectado com sucesso.')
    return redirect(url_for('login'))

@app.route('/download')
def download():
    return render_template('download.html')

@app.route('/details/<manga_id>')
def details(manga_id):
    return render_template('details.html', manga_id=manga_id)

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
        
        path_ = Path(config_data['download_folder']) if config_data['download_folder'] != '' else os.getcwd()
        
        if volume:
            path = os.path.join(path_, translated, manga_title, f"{chapter_} - v{volume}")
        else:
            path = os.path.join(path_, translated, manga_title, chapter_)
        
        download_core = DownloadChapters(manga_title, translated, chapter_, chapter_id, path, config_data['upload'], config_data['api_url'])
        DOWNLOAD_QUEUE.put(download_core)
        
        queue_download[f'{manga_title} - {translated} - {chapter_}'] = {
            'chapter_id': chapter_id,
            'title': manga_title,
            'translated': translated,
            'chapter': chapter_,
            'volume': volume,
            'path': path,
            'status': 'Aguardando',
            'error': None
        }
    
    return jsonify({'status': 'success', 'message': 'Capítulos enviados para download em segundo plano.'})

@app.route('/upload', methods=['GET'])
def upload():
    return render_template('upload.html', min_datetime=min_datetime, max_datetime=max_datetime)

@app.route('/search_projects', methods=['GET'])
def search_projects():
    config = config_core.load_config()
    
    query = request.args.get('query', '')
    url = f"{config['api_url']}/manga?title={query}"
    response = requests.get(url)
    results = []
    if response.ok:
        data = response.json()
        results = [{'id': manga['id'], 'title': manga['attributes']['title']['en']} for manga in data['data']]
    return jsonify(results=results)

@app.route('/search_groups', methods=['GET'])
def search_groups():
    config = config_core.load_config()
    
    query = request.args.get('query', '')
    url = f"{config['api_url']}/group?name={query}"
    response = requests.get(url)
    results = []
    if response.ok:
        data = response.json()
        results = [{'id': group['id'], 'name': group['attributes']['name'], 'lang': group['attributes']['focusedLanguages']} for group in data['data']]
    return jsonify(results=results)

@app.route('/submit', methods=['POST'])
def submit():
    config_data = config_core.load_config()
    
    data = request.get_json()

    def get_manga(id):
        url = f"{config_data['api_url']}/manga/{id}"
        response = requests.get(url)
        
        if response.ok:
            return response.json()['data']
        else:
            return None
    
    def get_group(id):
        url = f"{config_data['api_url']}/group/{id}"
        response = requests.get(url)
        
        if response.ok:
            return response.json()['data']
        else:
            return None
    
    path = Path(data['folder'])
    
    manga = get_manga(data['project']['id'])
    
    if manga:
        groups = []
        for group in data['groups']:
            group_ = get_group(group['id'])
            if group_:
                groups.append({
                    'id': group_['id'],
                    'name': group_['attributes']['name'],
                    'lang': group_['attributes']['focusedLanguages']
                })

        # Convertendo a data de upload para UTC
        if data['datetime'] != '':
            try:
                # Converte string ISO para objeto datetime e ajusta para UTC
                publish_date = datetime.fromisoformat(data['datetime'])
                publish_date = publish_date.astimezone(tz=timezone.utc)
            except ValueError:
                return jsonify(success=False, message='Formato de data inválido.')
            
            # Verificação se a data de upload é menor que a data atual
            current_utc_time = datetime.now(timezone.utc)
            if publish_date < current_utc_time:
                publish_date = None

            # Verificação se a data de upload é maior que duas semanas
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

        for item in list(UPLOAD_QUEUE.queue):
            item
            if item.manga_id == manga['id'] and item.language == data['language'] and item.groups == groups and item.volume == volume and item.chapter == chapter and item.path == path and item.oneshot == data['singleChapter']:
                return jsonify(success=False)

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
            config=config_core,
            login=login_core
        )
        
        UPLOAD_QUEUE.put(upload_core)
        
        queue_upload[f'{manga['attributes']['title']['en']} - {data['language']} - {chapter}'] = {
            'manga_id': manga['id'],
            'manga_title':manga['attributes']['title']['en'],
            'title': title,
            'language': data['language'],
            'groups': groups,
            'volume': volume,
            'chapter': chapter,
            'path': path,
            'datetime': publish_date_str,
            'oneshot': data['singleChapter'],
            'status': 'Aguardando',
            'error': None
        }

    return jsonify(success=True)

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

@app.route('/updates')
def updates():
    # URL do arquivo Markdown raw no GitHub
    url = 'https://raw.githubusercontent.com/OneDefauter/Manga-Downloader/main/src/change_log.md'
    
    # Faça a requisição para obter o conteúdo do arquivo
    response = requests.get(url)
    
    if response.status_code == 200:
        content = response.text
        # Converta o conteúdo Markdown para HTML
        html_content = markdown.markdown(content)
    else:
        html_content = '<p>Não foi possível carregar as atualizações.</p>'
    
    nem_update = True
    
    # Renderize o template com o conteúdo HTML
    return render_template('updates.html', content=Markup(html_content), nem_update=nem_update)

@app.route('/update', methods=['POST'])
def update_route():
    data = request.get_json()
    if data.get('update'):
        remote_release = requests.get(repo)
    
        if remote_release.ok:
            release = remote_release.json()
            zip_resp = requests.get(release["zipball_url"])
            if zip_resp.ok:
                myzip = ZipFile(BytesIO(zip_resp.content))
                zip_root = [z for z in myzip.infolist() if z.is_dir()][0].filename
                zip_files = [z for z in myzip.infolist() if not z.is_dir()]
                
                for fileinfo in zip_files:
                    filename = os.path.join(app_folder, fileinfo.filename.replace(zip_root, ""))
                    dirname = os.path.dirname(filename)
                    os.makedirs(dirname, exist_ok=True)
                    file_data = myzip.read(fileinfo)

                    with open(filename, "wb") as fopen:
                        fopen.write(file_data)
            
                    success = True
        
        if success:
            return jsonify(success=True)
        else:
            return jsonify(success=False)
    return jsonify(success=False)

@app.route('/queue')
def queue():
    return render_template('queue.html', queue_download=queue_download, queue_upload=queue_upload)

def setup_web():
    webbrowser.open('http://localhost:5007')
    app.run(host='localhost', port=5007, debug=False)

if __name__ == '__main__':
    webbrowser.open('http://localhost:5007')
    app.run(host='localhost', port=5007, debug=True)
