from app.src.workers.core import WorkerConfig, start_workers, stop_workers
from app.src.workers.runners import downloads as dl_runner
from app.src.workers.runners import uploads as up_runner
import threading

_restart_lock = threading.RLock()

def start_queue_workers():
    configs = [
        WorkerConfig(
            table="downloads",
            lease_seconds=300,
            heartbeat_seconds=2.0,
            max_retries_key=None,              # downloads: requeue manual ou defina se quiser
            simultaneous_key='dl.simultaneous',
            runner=dl_runner.run
        ),
        WorkerConfig(
            table="uploads",
            lease_seconds=300,
            heartbeat_seconds=2.0,
            max_retries_key="up.max_retries",  # respeita seu setting
            simultaneous_key=1,
            runner=up_runner.run
        ),
    ]
    return start_workers(configs)

def stop_queue_workers():
    stop_workers()

def restart_queue_workers():
    with _restart_lock:
        stop_queue_workers()
        start_queue_workers()
