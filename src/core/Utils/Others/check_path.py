import os
import sys
from tempfile import gettempdir
from time import sleep

def check_path():
    temp_folder = gettempdir()
    app_folder = os.path.join(temp_folder, "MangaDex Upload (APP)")
    
    os_path = os.getcwd()
    os_app_folder = os.path.join(os_path, "MangaDex Upload (APP)")
    
    if os.path.exists(app_folder):
        print(app_folder)
        return app_folder
    
    elif os.path.exists(os_app_folder):
        print(os_app_folder)
        return os_app_folder
    
    else:
        print("Folder 'MangaDex Upload (APP)' not found.")
        sleep(3)
        sys.exit()

def lib_path():
    temp_folder = gettempdir()
    app_folder = os.path.join(temp_folder, "MangaDex Upload (APP)")
    
    os_path = os.getcwd()
    os_app_folder = os.path.join(os_path, "MangaDex Upload (APP)")
    
    if os.path.exists(app_folder):
        print(app_folder)
        return 0, app_folder
    
    elif os.path.exists(os_app_folder):
        print(os_app_folder)
        return 1, os_app_folder
    
    else:
        print("Folder 'MangaDex Upload (APP)' not found.")
        sleep(3)
        sys.exit()