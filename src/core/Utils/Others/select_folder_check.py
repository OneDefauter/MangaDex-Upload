import platform

from src.core.Utils.Others.Windows.select_folder import select_folder as windows
from src.core.Utils.Others.Linux.select_folder import select_folder as linux

def check_for_folder():
    system = platform.system()
    
    if system == "Windows":
        r = windows()
        return r
    
    elif system == "Linux":
        r = linux()
        return r
    
    return None