# run.py
# ───────────────────────────────────────────────
# Somente STD LIB no topo!
import os, sys, time, socket, signal
from multiprocessing import Process, Queue

HOST = "0.0.0.0"
PORT = 5008

def wait_port_free(host: str, port: int, timeout: float = 15.0, poll: float = 0.2):
    deadline = time.time() + timeout
    while time.time() < deadline:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.2)
        try:
            if s.connect_ex(("127.0.0.1", port)) != 0:
                s.close()
                return
        finally:
            s.close()
        time.sleep(poll)

def run_child(restart_queue: Queue):
    # IMPORTS DO APP ACONTECEM AQUI DENTRO (depois da checagem do supervisor)
    from app import create_app
    from app.src.SocketIO import socket as socketio

    app = create_app(restart_queue)
    socketio.run(app, host=HOST, port=PORT, debug=True,
                 use_reloader=False, allow_unsafe_werkzeug=True)

def kill_process_tree(proc: Process, grace: float = 3.0):
    if not proc.is_alive():
        return
    try:
        proc.terminate()
    except Exception:
        pass
    t0 = time.time()
    while proc.is_alive() and (time.time() - t0) < grace:
        time.sleep(0.1)
    if proc.is_alive():
        try:
            os.kill(proc.pid, signal.SIGTERM)
        except Exception:
            pass
        t1 = time.time()
        while proc.is_alive() and (time.time() - t1) < 2.0:
            time.sleep(0.1)

def supervise():
    # Guard contra duas instâncias
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    if s.connect_ex(("127.0.0.1", PORT)) == 0:
        s.close()
        print(f"[supervisor] Já existe servidor na porta {PORT}. Abortando.")
        sys.exit(0)
    s.close()

    q = Queue()
    child = Process(target=run_child, args=(q,), daemon=False)
    child.start()
    print(f"[supervisor] PID={child.pid}")

    while True:
        try:
            msg = q.get()
        except KeyboardInterrupt:
            msg = "shutdown"

        if msg == "restart":
            print("[supervisor] Restarting…")
            kill_process_tree(child)
            wait_port_free("127.0.0.1", PORT, timeout=10)
            child = Process(target=run_child, args=(q,), daemon=False)
            child.start()
            print(f"[supervisor] PID={child.pid} (restarted)")
        elif msg in ("shutdown", "quit", None):
            print("[supervisor] Exiting…")
            kill_process_tree(child)
            break

if __name__ == "__main__":
    # 1) Checa dependências ANTES de importar o app
    from dependence import ensure_requirements
    ok = ensure_requirements(auto_install=True)
    if not ok:
        sys.exit(1)

    # 2) Só depois sobe o supervisor / importa o app no filho
    supervise()
