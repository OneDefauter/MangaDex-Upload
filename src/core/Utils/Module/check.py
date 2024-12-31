import os
import platform
import subprocess
import importlib
from src.core.Utils.Others.check_path import lib_path

def install_module(module, path=None):
    """Instala o módulo especificado."""
    try:
        # Detecta o sistema operacional
        if platform.system() == "Windows":
            # Comando para Windows
            if path is None:
                command = ['pip', 'install', module]
            else:
                command = [os.path.join(path, 'Python312', 'python.exe'), '-m', 'pip', 'install', module]
        else:
            # Comando para Linux/Mac (usando pip3 explicitamente)
            command = ['pip3', 'install', module]
        
        # Executa o comando
        subprocess.run(command, check=True)
        print(f"Módulo '{module}' instalado com sucesso!")
    except subprocess.CalledProcessError as e:
        print(f"Erro ao instalar {module}: {e}")
    except PermissionError as e:
        print(f"Permissão negada ao tentar instalar {module}. Certifique-se de executar como administrador/sudo. Erro: {e}")


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
    'flask-session'
]

# Mapeamento de módulos com nomes alternativos para importação
alternate_imports = {
    'Pillow': 'PIL',
    'pycryptodome': ['Crypto', 'Cryptodome'],
    'flask-session': 'flask_session'
}

lib, path_ = lib_path()

for module in required_modules:
    # Verificar nomes alternativos
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
        install_module(module, None if lib == 0 else path_)

# Limpar a tela
os.system('cls' if platform.system() == "Windows" else 'clear')
