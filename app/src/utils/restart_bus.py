# guarda uma referência à fila de restart para uso fora do contexto Flask
_restart_queue = None

def set_restart_queue(q):
    global _restart_queue
    _restart_queue = q

def get_restart_queue():
    return _restart_queue
