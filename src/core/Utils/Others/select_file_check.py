import platform

from src.core.Utils.Others.Windows.select_file import select_file as windows
from src.core.Utils.Others.Linux.select_file import select_file as linux

def check_for_file():
    system = platform.system()
    
    if system == "Windows":
        r = windows()
        return r
    
    elif system == "Linux":
        r = linux()
        return r
    
    return None