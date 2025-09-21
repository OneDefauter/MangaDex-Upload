# app/src/workers/core.py
import time, uuid, threading, apsw, textwrap
from dataclasses import dataclass
from typing import Callable, Optional, Dict, Any
from app.src.SocketIO import socket

from app.src.database.db import (
    open_db, get_setting,
    claim_next_job,
    heartbeat,
    mark_done, mark_error,
    recover_orphan_jobs
)
from app.src.path import DB_PATH
from app.src.services.language import t as tr, get_effective_lang
from app.src.logging import logger

POLL_MIN_SLEEP = 0.25
POLL_MAX_SLEEP = 5.0

# rótulos padrão (fallback) — preferimos traduzir via i18n abaixo
TABLE_LABEL_FALLBACK = {
    "downloads": "Download",
    "uploads": "Upload"
}

class Cancelled(Exception):
    """Job foi cancelado ou perdeu o lease durante a execução."""
    pass

@dataclass
class WorkerConfig:
    table: str                          # "downloads" | "uploads"
    lease_seconds: int = 300
    heartbeat_seconds: float = 2.0
    max_retries_key: Optional[str] = None  # ex.: "up.max_retries" p/ uploads
    simultaneous_key: Optional[str] = None # ex.: "dl.simultaneous" | "up.simultaneous"
    runner: Callable[[apsw.Connection, Dict[str, Any], Callable[[Optional[int]], None]], None] = None

def _open_thread_conn() -> apsw.Connection:
    return open_db(DB_PATH)

def _with_heartbeat(conn: apsw.Connection, cfg: WorkerConfig, job: Dict[str, Any], worker_id: str):
    """Cria callback de HB + watchdog thread para passar ao runner."""
    job_id = job["id"]

    def _hb(bp: int | None = None):
        return heartbeat(
            conn, cfg.table, job_id,
            worker_id=worker_id, bp=bp,
            lease_seconds=cfg.lease_seconds
        )

    stop = threading.Event()

    def _loop():
        while not stop.wait(cfg.heartbeat_seconds):
            if _hb(None) is False:
                break  # lease perdido / cancelado → para watchdog

    t = threading.Thread(target=_loop, name=f"hb-{cfg.table}-{job_id}", daemon=True)
    t.start()
    return _hb, stop, t

def worker_loop(cfg: WorkerConfig, stop_event: threading.Event):
    assert cfg.table in ("downloads", "uploads")
    conn = _open_thread_conn()
    worker_id = f"{cfg.table}:{threading.current_thread().name}:{uuid.uuid4().hex[:8]}"
    backoff = POLL_MIN_SLEEP

    lang = get_effective_lang()

    logger.info(
        tr(lang, "workers.core.log.started", namespace="app",
           default_value="Worker {worker} started for table {table}"
        ).format(worker=worker_id, table=cfg.table)
    )

    # rótulo da tabela (traduzido com fallback)
    table_label = tr(
        lang,
        f"workers.core.table.{cfg.table}",
        namespace="app",
        default_value=TABLE_LABEL_FALLBACK.get(cfg.table, cfg.table)
    )

    # lê max_retries, se existir
    max_retries = None
    if cfg.max_retries_key:
        try:
            mr = int(get_setting(conn, cfg.max_retries_key, 5) or 5)
            max_retries = mr
        except Exception:
            max_retries = None

    def _fmt_msg(key: str, job: Dict[str, Any]) -> str:
        """
        key: started | finished | canceled | failed
        placeholders: {table}, {id}, {worker}, {project}, {chapter}
        """
        vars_ = {
            "table": table_label,
            "id": job.get("id"),
            "worker": worker_id,
            "project": job.get("projeto") or "",
            "chapter": job.get("capitulo") or "",
        }
        # fallback padrão (pt) caso a chave não exista
        default_tpls = {
            "started":  "{table} iniciado\nID: {id}\nWorker: {worker}\nProjeto: {project}\nCapítulo: {chapter}",
            "finished": "{table} concluído\nID: {id}\nWorker: {worker}\nProjeto: {project}\nCapítulo: {chapter}",
            "canceled": "{table} cancelado\nID: {id}\nWorker: {worker}\nProjeto: {project}\nCapítulo: {chapter}",
            "failed":   "{table} falhou\nID: {id}\nWorker: {worker}\nProjeto: {project}\nCapítulo: {chapter}",
        }
        tpl = tr(
            lang,
            f"workers.core.notify.{key}",
            namespace="app",
            default_value=default_tpls.get(key, "{table}").strip()
        )
        try:
            return tpl.format(**vars_)
        except Exception:
            # se algo inesperado acontecer na formatação, usa um resumo simples
            return f"{table_label}: {key} (ID={vars_['id']})"

    try:
        while not stop_event.is_set():
            job = claim_next_job(conn, cfg.table, worker_id=worker_id, lease_seconds=cfg.lease_seconds)
            if not job:
                seconds_str = f"{backoff:.2f}"
                logger.debug(
                    tr(lang, "workers.core.log.no_job_sleep", namespace="app",
                       default_value="Worker {worker} found no job for table {table}; sleeping {seconds}s"
                    ).format(worker=worker_id, table=cfg.table, seconds=seconds_str)
                )
                time.sleep(backoff)
                backoff = min(POLL_MAX_SLEEP, max(POLL_MIN_SLEEP, backoff * 1.5))
                continue

            job_id = job.get("id")
            logger.debug(
                tr(lang, "workers.core.log.claimed", namespace="app",
                   default_value="Worker {worker} claimed job {job} from table {table}"
                ).format(worker=worker_id, job=job_id, table=cfg.table)
            )

            socket.emit('notify', { 'type': 'info', 'message': _fmt_msg("started", job) })
            backoff = POLL_MIN_SLEEP

            hb, stop_hb, t = _with_heartbeat(conn, cfg, job, worker_id)
            try:
                # progresso inicial
                if not hb(0):
                    raise Cancelled()

                # runner específico (faz o trabalho)
                cfg.runner(conn, job, hb)

                socket.emit('notify', { 'type': 'success', 'message': _fmt_msg("finished", job) })
                mark_done(conn, cfg.table, job["id"])

            except Cancelled:
                logger.debug(
                    tr(lang, "workers.core.log.cancelled_or_lease_lost", namespace="app",
                       default_value="Worker {worker} job {job} cancelled or lease lost"
                    ).format(worker=worker_id, job=job_id)
                )
                socket.emit('notify', { 'type': 'info', 'message': _fmt_msg("canceled", job) })
                # não marca erro nem done; status já está 'canceled'

            except Exception as e:
                logger.error(
                    tr(lang, "workers.core.log.failed_with_error", namespace="app",
                       default_value="Worker {worker} job {job} failed with error: {error}"
                    ).format(worker=worker_id, job=job_id, error=e),
                    exc_info=True,
                )
                socket.emit('notify', { 'type': 'error', 'message': _fmt_msg("failed", job) })
                mark_error(conn, cfg.table, job["id"], str(e), max_retries=max_retries)

            finally:
                stop_hb.set()
                t.join(timeout=1.0)
    finally:
        try:
            conn.close()
        except:
            pass

class WorkerGroup:
    def __init__(self, configs: list[WorkerConfig]):
        self.stop_event = threading.Event()
        self.threads: list[threading.Thread] = []
        self.configs = configs

    def start(self):
        conn = open_db(DB_PATH)
        try:
            # recupera órfãos por tabela antes de iniciar
            seen = set()
            for cfg in self.configs:
                if cfg.table in seen:
                    continue
                recover_orphan_jobs(conn, cfg.table)
                seen.add(cfg.table)
        finally:
            conn.close()

        for cfg in self.configs:
            # simultaneidade por config
            n = 1
            if cfg.simultaneous_key:
                # se não existir nos settings, caia pra 1
                conn = open_db(DB_PATH)
                try:
                    n = int(get_setting(conn, cfg.simultaneous_key, 1) or 1)
                finally:
                    conn.close()
            logger.debug(
                tr(get_effective_lang(), "workers.core.log.concurrency_resolved", namespace="app",
                   default_value="Resolved concurrency for table {table} using key {key}: {n}"
                ).format(table=cfg.table, key=(cfg.simultaneous_key or "<default>"), n=n)
            )
            for i in range(max(1, n)):
                worker_name = f"{cfg.table}-worker-{i+1}"
                logger.debug(
                    tr(get_effective_lang(), "workers.core.log.starting_thread", namespace="app",
                       default_value="Starting worker thread name={name} table={table} worker_id={num}"
                    ).format(name=worker_name, table=cfg.table, num=i+1)
                )
                t = threading.Thread(
                    target=worker_loop,
                    args=(cfg, self.stop_event),
                    name=worker_name,
                    daemon=True
                )
                t.start()
                time.sleep(0.01)  # evita start simultâneo
                self.threads.append(t)

    def stop(self, timeout: float = 5.0):
        self.stop_event.set()
        for t in self.threads:
            t.join(timeout=timeout)

_group: Optional[WorkerGroup] = None

def start_workers(configs: list[WorkerConfig]) -> WorkerGroup:
    global _group
    if _group is None:
        _group = WorkerGroup(configs)
        _group.start()
    return _group

def stop_workers():
    global _group
    if _group:
        _group.stop()
        _group = None
