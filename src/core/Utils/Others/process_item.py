import tempfile

def process_item(args):
    item, folderpath, groups, config, preprocessor, language, SCAN = args
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
                
                if config['preprocess_images']:
                    ispre = True
                    temp_dir = tempfile.mkdtemp(prefix='MDU_')
                    success, error_message = preprocessor.extract_archive(file_path, temp_dir)
                    if not success:
                        return {'error': f"Extraction failed for {file_path.name}: {error_message}"}
                
                scans = []
                for x, chapters in groups.items():
                    for scan in chapters['scans']:
                        group_ = SCAN.get_scan(scan['id'])
                        if group_:
                            scans.append({
                                'id': group_['id'],
                                'name': group_['attributes']['name'],
                                'lang': group_['attributes']['focusedLanguages']
                            })
                
                # Atualiza o resultado
                result_key = file_path.name.replace('.', '_').replace(' ', '_')
                result[result_key] = [{
                    'file': file_path.name,
                    'path': temp_dir,
                    'group': scans,
                    'chapter': chapter,
                    'title': title,
                    'volume': volume,
                    'language': language,
                    'ispre': ispre
                }]

    elif file_path.is_dir():
        for group_name, group_data in groups.items():
            group_items = group_data.get('items', [])
            matching_item = next((file for file in group_items if file['filename'] == item), None)
            if matching_item:
                chapter = matching_item['chapter']
                title = matching_item['title']
                volume = group_data.get('volume', None)
                
                if config['preprocess_images']:
                    ispre = True
                    temp_dir = tempfile.mkdtemp(prefix='MDU_')
                    
                    success = preprocessor.preprocess_image_folder(file_path, temp_dir)
                    if not success:
                        return {'error': f"Preprocessing failed for {file_path.name}"}
                
                scans = []
                for x, chapters in groups.items():
                    for scan in chapters['scans']:
                        group_ = SCAN.get_scan(scan['id'])
                        if group_:
                            scans.append({
                                'id': group_['id'],
                                'name': group_['attributes']['name'],
                                'lang': group_['attributes']['focusedLanguages']
                            })
                
                # Atualiza o resultado
                result_key = file_path.name
                result[result_key] = [{
                    'file': file_path.name,
                    'path': temp_dir,
                    'group': scans,
                    'chapter': chapter,
                    'title': title,
                    'volume': volume,
                    'language': language,
                    'ispre': ispre
                }]

    return result