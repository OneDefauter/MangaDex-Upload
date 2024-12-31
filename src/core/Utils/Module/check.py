import os
import platform
import subprocess
import importlib
from src.core.Utils.Others.check_path import lib_path

def print_colored(message, color):
    """Exibe uma mensagem colorida no terminal."""
    colors = {
        'red': '\033[91m',
        'green': '\033[92m',
        'yellow': '\033[93m',
        'blue': '\033[94m',
        'reset': '\033[0m'
    }
    print(f"{colors.get(color, colors['reset'])}{message}{colors['reset']}")

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
        print_colored(f"Módulo '{module}' instalado com sucesso!", 'green')
    except subprocess.CalledProcessError as e:
        print_colored(f"Erro ao instalar {module}: {e}", 'red')
        if module == 'numpy':
            print_colored("\nInstruções para instalar o numpy manualmente no Pydroid3:", 'yellow')
            print_colored("1. Abra a aba Pip.", 'yellow')
            print_colored("2. Em 'install', coloque 'numpy'.", 'yellow')
            print_colored("3. Marque a caixa 'Use prebuilt libraries repository'.", 'yellow')
    except PermissionError as e:
        print_colored(f"Permissão negada ao tentar instalar {module}. Certifique-se de executar como administrador/sudo. Erro: {e}", 'red')

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
    'flask-session',
    'numpy'
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