import re
import tempfile
import traceback

def process_item(args):
    try:
        item, folderpath, groups, config, preprocessor, language, SCAN, queues, QUEUE_CORE, manga_id, manga_title, unique_id, translate, socket = args
        file_path = folderpath / item
        result = {}
        ispre = False
        temp_dir = None

        if file_path.suffix in [".zip", ".cbz"]:
            for group_name, group_data in groups.items():
                group_items = group_data.get('items', [])
                matching_item = next((file for file in group_items if file['filename'] == item), None)
                if matching_item:
                    chapter = matching_item['chapter']
                    title = matching_item['title']
                    volume = group_data.get('volume', None)

                    # Verificar se o capítulo já existe no `queues['uploads']`
                    existing_entry = next(
                        (key for key, value in queues['uploads'].items()
                         if value['project']['manga_id'] == manga_id and
                            value['chapter']['language'] == language and
                            value['chapter']['groups'] == [scan['id'] for scan in group_data['scans']] and
                            value['chapter']['chapter'] == chapter and
                            value['chapter']['volume'] == volume),
                        None
                    )

                    if existing_entry:
                        existing_status = queues['uploads'][existing_entry]['status']['value']
                        existing_showing = queues['uploads'][existing_entry]['status'].get('showing', 0)

                        if existing_status in [0, 4]:  # Ignorar se está Aguardando ou Processando
                            queues['uploads'][existing_entry]['status']['skipped'] = 1
                            return queues

                        if existing_status == 1:  # Atualizar apenas se showing == 0
                            if existing_showing == 0:
                                unique_id = existing_entry
                            else:
                                queues['uploads'][existing_entry]['status']['skipped'] = 1
                                return queues

                        elif existing_status in [2, 3]:
                            unique_id = existing_entry

                    # Preprocessamento
                    if config['preprocess_images']:
                        ispre = True
                        temp_dir = tempfile.mkdtemp(prefix='MDU_')
                        success, error_message = preprocessor.extract_archive(file_path, temp_dir)
                        if not success:
                            return {'error': f"Extraction failed for {file_path.name}: {error_message}"}

                    else:
                        temp_dir = None

                    scans = []
                    for scan in group_data['scans']:
                        name = re.sub(r'\s*\(.*?\)', '', scan['name'])
                        scans.append({
                            'id': scan['id'],
                            'name': name
                        })

                    # Adiciona ou atualiza o resultado na estrutura desejada
                    result[unique_id] = {
                        "project": {
                            "manga_id": manga_id,
                            "manga_title": manga_title
                        },
                        "chapter": {
                            "title": title,
                            "language": language,
                            "groups": scans,
                            "chapter": chapter,
                            "volume": volume,
                            "oneshot": None,
                            "datetime": None,
                            "path": {
                                "main": str(file_path),
                                "temp": str(temp_dir) if temp_dir else None
                            }
                        },
                        "status": {
                            "type": "Aguardando",
                            "value": 0,
                            "skipped": 0,
                            "showing": 1,
                            "notif": False,
                            "detail": None,
                            "error": None
                        },
                        "others": {
                            "ispre": ispre,
                            "iszip": True
                        },
                        "pre_notif": {
                            "manga_title": manga_title,
                            "chapter": chapter,
                            "status": 0,
                            "detail": None,
                            "error": None
                        }
                    }

        elif file_path.is_dir():
            for group_name, group_data in groups.items():
                group_items = group_data.get('items', [])
                matching_item = next((file for file in group_items if file['filename'] == item), None)
                if matching_item:
                    chapter = matching_item['chapter']
                    title = matching_item['title']
                    volume = group_data.get('volume', None)

                    # Verificar se o capítulo já existe no `queues['uploads']`
                    existing_entry = next(
                        (key for key, value in queues['uploads'].items()
                         if value['project']['manga_id'] == manga_id and
                            value['chapter']['language'] == language and
                            value['chapter']['groups'] == [scan['id'] for scan in group_data['scans']] and
                            value['chapter']['chapter'] == chapter and
                            value['chapter']['volume'] == volume),
                        None
                    )

                    if existing_entry:
                        existing_status = queues['uploads'][existing_entry]['status']['value']
                        existing_showing = queues['uploads'][existing_entry]['status'].get('showing', 0)

                        if existing_status in [0, 4]:  # Ignorar se está Aguardando ou Processando
                            queues['uploads'][existing_entry]['status']['skipped'] = 1
                            return queues

                        if existing_status == 1:  # Atualizar apenas se showing == 0
                            if existing_showing == 0:
                                unique_id = existing_entry
                            else:
                                queues['uploads'][existing_entry]['status']['skipped'] = 1
                                return queues

                        elif existing_status in [2, 3]:
                            unique_id = existing_entry

                    # Preprocessamento
                    if config['preprocess_images']:
                        ispre = True
                        temp_dir = tempfile.mkdtemp(prefix='MDU_')
                        success = preprocessor.preprocess_image_folder(file_path, temp_dir)
                        if not success:
                            return {'error': f"Preprocessing failed for {file_path.name}"}
                    else:
                        temp_dir = None

                    scans = []
                    for scan in group_data['scans']:
                        name = re.sub(r'\s*\(.*?\)', '', scan['name'])
                        scans.append({
                            'id': scan['id'],
                            'name': name
                        })

                    # Adiciona ou atualiza o resultado na estrutura desejada
                    result[unique_id] = {
                        "project": {
                            "manga_id": manga_id,
                            "manga_title": manga_title
                        },
                        "chapter": {
                            "title": title,
                            "language": language,
                            "groups": scans,
                            "chapter": chapter,
                            "volume": volume,
                            "oneshot": None,
                            "datetime": None,
                            "path": {
                                "main": str(file_path),
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
                            "ispre": ispre,
                            "iszip": False
                        },
                        "pre_notif": {
                            "manga_title": manga_title,
                            "chapter": chapter,
                            "status": 0,
                            "detail": None,
                            "error": None
                        }
                    }

        socket.emit('get_folder_size')
        return result
    except Exception as e:
        traceback.print_exception(e)
        print()
    