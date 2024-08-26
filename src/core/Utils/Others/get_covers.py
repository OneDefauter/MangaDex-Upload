import os

cover_dir = os.path.join('static', 'covers')

def get_folder_size():
    total_size = 0
    for dirpath, dirnames, filenames in os.walk(cover_dir):
        for f in filenames:
            fp = os.path.join(dirpath, f)
            total_size += os.path.getsize(fp)
    return total_size