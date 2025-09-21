# utils/storage_usage.py
import os, shutil, tempfile

PREFIX_PREFETCH = "upload_prefetch_"
PREFIX_RAW      = "upload_raw_"

def _iter_dirs(prefix: str):
    tmp = tempfile.gettempdir()
    for name in os.listdir(tmp):
        if name.startswith(prefix):
            path = os.path.join(tmp, name)
            if os.path.isdir(path):
                yield path

def _usage_bytes(prefix: str) -> int:
    total = 0
    for root_dir in _iter_dirs(prefix):
        for root, _, files in os.walk(root_dir):
            for fn in files:
                fp = os.path.join(root, fn)
                try: total += os.path.getsize(fp)
                except OSError: pass
    return total

def _clear_dirs(prefix: str) -> int:
    removed = 0
    for d in list(_iter_dirs(prefix)):
        try:
            shutil.rmtree(d, ignore_errors=True)
            removed += 1
        except Exception:
            pass
    return removed

# ----- wrappers: prefetch -----
def get_prefetch_usage_bytes() -> int:
    return _usage_bytes(PREFIX_PREFETCH)

def clear_prefetch_dirs() -> int:
    return _clear_dirs(PREFIX_PREFETCH)

# ----- wrappers: raw -----
def get_raw_usage_bytes() -> int:
    return _usage_bytes(PREFIX_RAW)

def clear_raw_dirs() -> int:
    return _clear_dirs(PREFIX_RAW)
