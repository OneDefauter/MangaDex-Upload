import os
import subprocess

required_modules = [
        'requests',
        'natsort',
        'Pillow',
        'tqdm',
        'flask',
        'markupsafe',
        'markdown',
        'packaging',
        'pycryptodome'
    ]

for module in required_modules:
    try:
        if module == 'Pillow':
            __import__('PIL')
        else:
            __import__(module)
    except ImportError:
        subprocess.run(['pip', 'install', module])

os.system('cls' if os.name == 'nt' else 'clear')
