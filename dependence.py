# dependence.py
import sys
import os
import subprocess
import shlex
import importlib.metadata

from mini_i18n import t, get_effective_lang

def _clear_terminal():
    if os.name == 'nt':
        os.system('cls')
    else:
        os.system('clear')


def _run(cmd, check=True):
    # Aceita tanto lista quanto string
    if isinstance(cmd, str):
        cmd = shlex.split(cmd)
    return subprocess.run(cmd, check=check)


def _has_pip(py=sys.executable) -> bool:
    try:
        _run([py, "-m", "pip", "--version"])
        return True
    except Exception:
        return False


def _bootstrap_pip(py=sys.executable):
    lang = get_effective_lang()

    print(t(lang, "dependence.preparing_pip", namespace="app"))
    try:
        # Tenta inicializar/atualizar o pip embutido
        _run([py, "-m", "ensurepip", "--upgrade", "--quiet"])
    except Exception as e:
        print(t(lang, "dependence.ensurepip_fail", namespace="app").format(error=e))

    if not _has_pip(py):
        # Último recurso: tenta chamar um pip externo (fora do venv)
        from shutil import which
        p3 = which("pip3") or which("pip")
        if p3:
            print(t(lang, "dependence.using_aux_installer", namespace="app").format(path=p3))
            try:
                _run([p3, "install", "--upgrade", "pip", "setuptools", "wheel", "--quiet"])
            except Exception as e:
                print(t(lang, "dependence.aux_fail", namespace="app").format(error=e))

    # Confere novamente
    if not _has_pip(py):
        print(t(lang, "dependence.no_pip_available", namespace="app"))
        print(t(lang, "dependence.apt_hint", namespace="app"))
        return False

    # Atualiza ferramentas base
    try:
        print(t(lang, "dependence.updating_tools", namespace="app"))
        _run([py, "-m", "pip", "install", "--upgrade", "pip", "setuptools", "wheel", "--quiet"])
    except Exception as e:
        print(t(lang, "dependence.update_tools_fail", namespace="app").format(error=e))

    return True


def _parse_req_name(req: str) -> str:
    """
    Extrai o nome 'canônico' do pacote da linha do requirements (sem versão/markers).
    Não resolve extras especificados como 'pkg[extra]'; usa o nome base.
    """
    # corta marcador de ambiente
    base = req.split(";")[0].strip()
    # corta @ URLs e paths locais, deixa o nome se possível
    if "@" in base and "://" in base:
        # formato 'nome @ url'; tenta pegar antes do ' @ '
        base_left = base.split("@", 1)[0].strip()
        if base_left:
            base = base_left
    # remove extras [..]
    if "[" in base and "]" in base:
        base = base[: base.index("[")] + base[base.index("]") + 1 :]
    # remove especificadores de versão/operadores
    for sep in ("==", ">=", "<=", "~=", "!=", ">", "<"):
        base = base.split(sep)[0]
    return base.strip()


def ensure_requirements(file_path="requirements.txt", auto_install=False):
    lang = get_effective_lang()

    # 1) Lê o requirements
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            requirements = [
                line.strip()
                for line in f
                if line.strip() and not line.lstrip().startswith("#")
            ]
    except FileNotFoundError:
        print(t(lang, "dependence.errors.file_not_found", namespace="app").format(file=file_path))
        sys.exit(1)

    # 2) Detecta faltantes
    missing = []
    for req in requirements:
        name = _parse_req_name(req)
        if not name:
            # linhas como "-e ." ou apenas VCS/paths não possuem "nome"
            # deixamos para o pip resolver
            print(t(lang, "dependence.special_requirement", namespace="app").format(req=req))
            missing.append(req)
            continue
        try:
            v = importlib.metadata.version(name)
            print(t(lang, "dependence.installed", namespace="app").format(name=name, version=v))
        except importlib.metadata.PackageNotFoundError:
            print(t(lang, "dependence.missing", namespace="app").format(req=req))
            missing.append(req)

    if not missing:
        print(t(lang, "dependence.all_installed", namespace="app"))
        _clear_terminal()
        return True

    print(t(lang, "dependence.missing_detected", namespace="app"))
    for m in missing:
        print(f"  - {m}")

    if not auto_install:
        print(t(lang, "dependence.hint_install", namespace="app").format(file=file_path))
        return False

    # 3) Garante pip no Python atual
    py = sys.executable
    in_venv = (hasattr(sys, "base_prefix") and sys.prefix != sys.base_prefix) or bool(os.environ.get("VIRTUAL_ENV"))
    if in_venv:
        print(t(lang, "dependence.detected_venv", namespace="app").format(path=sys.prefix))
    else:
        print(t(lang, "dependence.running_global", namespace="app"))

    if not _has_pip(py):
        if not _bootstrap_pip(py):
            return False

    # 4) Tenta instalar os faltantes
    print(t(lang, "dependence.installing", namespace="app"))
    try:
        # Primeiro tenta usar -r se o conjunto de faltantes for grande/complexo
        use_file = any(x.startswith(("-e ", "git+", "http://", "https://", "file:")) for x in missing)
        if use_file:
            _run([py, "-m", "pip", "install", "-r", file_path, "--quiet"])
        else:
            _run([py, "-m", "pip", "install", *missing, "--quiet"])

        print(t(lang, "dependence.install_complete", namespace="app"))
        _clear_terminal()
        return True
    except subprocess.CalledProcessError as e:
        print(t(lang, "dependence.install_error", namespace="app").format(error=e))
        # Ajuda específica para pacotes chatos (ex.: apsw)
        if any("apsw" in m.lower() for m in missing):
            print(t(lang, "dependence.apsw_hint", namespace="app"))
        return False
