import os
import sys
import platform
import subprocess
import importlib
from src.core.Utils.Others.check_path import lib_path

def install_module(module, path=None):
    """Instala o módulo especificado."""
    try:
        print(f"⏳ Instalando '{module}'...")
        # Detecta o sistema operacional
        if platform.system() == "Windows":
            if path is None:
                command = ['pip', 'install', module, '--disable-pip-version-check', '--quiet']
            else:
                command = [os.path.join(path, 'Python312', 'python.exe'), '-m', 'pip', 'install', module, '--disable-pip-version-check', '--quiet']
        else:
            command = ['pip3', 'install', module, '--disable-pip-version-check', '--quiet']

        # Tenta instalar da internet
        subprocess.run(command, check=True)
        print(f"✔ '{module}' instalado com sucesso!")
    except subprocess.CalledProcessError:
        print(f"⚠ Erro ao instalar '{module}'.")

# Lista de módulos obrigatórios
required_modules = [
    'requests',
    'natsort',
    'Pillow',
    'tqdm',
    'flask',
    'markupsafe',
    'markdown',
    'packaging',
    'pycryptodome',
    'flask-session2',
    'flask-socketio',
    'bs4',
    'apsw',
    'scipy'
]

# Mapeamento de módulos com nomes alternativos para importação
alternate_imports = {
    'Pillow': ['PIL'],
    'pycryptodome': ['Crypto', 'Cryptodome'],
    'flask-session2': ['flask_session'],
    'flask-socketio': ['flask_socketio']
}

lib, path_ = lib_path()

# Dicionário para armazenar o status da instalação
installed_status = {}

for module in required_modules:
    # Verifica nomes alternativos
    alternatives = alternate_imports.get(module, module)
    if not isinstance(alternatives, list):
        alternatives = [alternatives]
    
    installed = False
    for alt in alternatives:
        try:
            importlib.import_module(alt)
            installed = True
            break
        except ImportError:
            pass  # Tente o próximo nome alternativo
    
    if not installed:
        # Tenta instalar se não estiver instalado
        install_module(module, None if lib == 0 else path_)
        # Após instalação, tenta importar novamente
        for alt in alternatives:
            try:
                importlib.import_module(alt)
                installed = True
                break
            except ImportError:
                pass
    installed_status[module] = installed
    if installed:
        print(f"✔ Dependência '{module}' verificada.")
    else:
        print(f"✖ Dependência '{module}' NÃO foi instalada.")

# Verifica se todas as dependências foram instaladas
if all(installed_status.values()):
    # Se tudo ok, limpa a tela e procede para a verificação da lista de chaves
    os.system('cls' if platform.system() == "Windows" else 'clear')
else:
    # Lista os módulos que falharam na instalação
    failed = [module for module, status in installed_status.items() if not status]
    print("Algumas dependências não foram instaladas corretamente:")
    for module in failed:
        print(f" - {module}")
    print("Por favor, verifique os erros acima.")
    sys.exit(1)
