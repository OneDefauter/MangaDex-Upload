import os
import zipfile

def extract_archive(archive_path, extract_to):
    file_extension = archive_path.suffix.lower()

    os.makedirs(extract_to, exist_ok=True)

    try:
        if file_extension in [".zip", ".cbz"]:
            with zipfile.ZipFile(archive_path, 'r') as zip_ref:
                zip_ref.extractall(extract_to)
        else:
            return False, f"Unsupported archive format: {file_extension}"
        
        return True, None
    except Exception as e:
        return False, str(e)