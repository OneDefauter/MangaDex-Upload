from flask_socketio import emit
from app.src.SocketIO import socket
from app.src.utils.storage_usage import (
    get_prefetch_usage_bytes, clear_prefetch_dirs,
    get_raw_usage_bytes, clear_raw_dirs
)

# ----- Prefetch -----
@socket.on("prefetch:request_size")
def _prefetch_request():
    emit("prefetch:size", {"bytes": get_prefetch_usage_bytes()})

@socket.on("prefetch:clear")
def _prefetch_clear():
    removed = clear_prefetch_dirs()
    size = get_prefetch_usage_bytes()
    emit("prefetch:cleared", {"removed": removed, "bytes": size})
    socket.emit("prefetch:size", {"bytes": size})

# ----- Raw -----
@socket.on("raw:request_size")
def _raw_request():
    emit("raw:size", {"bytes": get_raw_usage_bytes()})

@socket.on("raw:clear")
def _raw_clear():
    removed = clear_raw_dirs()
    size = get_raw_usage_bytes()
    emit("raw:cleared", {"removed": removed, "bytes": size})
    socket.emit("raw:size", {"bytes": size})