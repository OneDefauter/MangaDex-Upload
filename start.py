import os
import sys
import tempfile
import subprocess
from io import BytesIO
from zipfile import ZipFile

OWNER = "OneDefauter"
REPO = "MangaDex-Upload"
API_URL = f"https://api.github.com/repos/{OWNER}/{REPO}/releases/latest"

def ensure_requests():
    try:
        import requests  # noqa: F401
    except ImportError:
        print("[deps] Instalando 'requests'...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])

def download_app(app_folder):
    import requests
    print("[dl] Consultando release mais recente...")
    r = requests.get(API_URL, headers={"Accept": "application/vnd.github+json"})
    if not r.ok:
        raise SystemExit(f"Falha ao consultar release: {r.status_code}")
    release = r.json()
    zip_url = release.get("zipball_url")
    if not zip_url:
        raise SystemExit("zipball_url ausente na resposta da API")

    print(f"[dl] Baixando de: {zip_url}")
    z = requests.get(zip_url)
    if not z.ok:
        raise SystemExit(f"Falha no download: {z.status_code}")

    with ZipFile(BytesIO(z.content)) as zf:
        root_dir = None
        for info in zf.infolist():
            if info.is_dir():
                root_dir = info.filename
                break
        for info in zf.infolist():
            if info.is_dir():
                continue
            rel_path = info.filename
            if root_dir and rel_path.startswith(root_dir):
                rel_path = rel_path[len(root_dir):]
            if not rel_path.strip():
                continue
            target = os.path.join(app_folder, rel_path)
            os.makedirs(os.path.dirname(target), exist_ok=True)
            with zf.open(info) as src, open(target, "wb") as dst:
                dst.write(src.read())
    print(f"[dl] App baixado para: {app_folder}")

def main():
    ensure_requests()
    import requests  # garantido

    app_folder = os.path.join(tempfile.gettempdir(), "MangaDex Upload (APP)")
    run_py = os.path.join(app_folder, "run.py")

    if not os.path.isfile(run_py):
        print("[app] Aplicativo não encontrado. Baixando...")
        if os.path.isdir(app_folder):
            import shutil
            shutil.rmtree(app_folder, ignore_errors=True)
        os.makedirs(app_folder, exist_ok=True)
        download_app(app_folder)
    else:
        print("[app] Aplicativo já baixado. Iniciando...")

    # Inicia o aplicativo via "python -m run"
    print(f"[run] Executando módulo: run (cwd={app_folder})")
    os.chdir(app_folder)

    env = os.environ.copy()
    sep = ";" if os.name == "nt" else ":"
    env["PYTHONPATH"] = (app_folder + sep + env.get("PYTHONPATH", "")) if env.get("PYTHONPATH") else app_folder

    os.execve(sys.executable, [sys.executable, "-m", "run"], env)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n[exit] Interrompido pelo usuário.")
    except Exception as e:
        print(f"[erro] {e}")
        sys.exit(1)
