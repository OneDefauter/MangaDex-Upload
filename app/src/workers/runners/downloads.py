# app/src/workers/runners/downloads.py
from __future__ import annotations

import errno
import re
import time
from pathlib import Path
from typing import Dict, Any, List, Optional

import apsw
import requests

from app.src.logging import logger
from app.src.services.language import t, get_effective_lang
from app.src.workers.core import Cancelled
from app.src.database.db import (
    get_setting,
    downloads_set_manifest,
    downloads_get_manifest,
)

# ──────────────────────────────────────────────────────────────────────────────
# Config (apenas do runner)
# ──────────────────────────────────────────────────────────────────────────────
REQ_TIMEOUT = (10, 60)   # (connect, read) seconds
CHUNK_SIZE  = 1024 * 256 # 256 KiB

MAX_RETRIES = 5
RETRY_DELAY = 2

_invalid = re.compile(r'[<>:"/\\|?*\x00-\x1F]')  # Windows + POSIX-unsafe


def _sanitize(name: str, *, keep_dots: bool = False) -> str:
    if not isinstance(name, str):
        name = str(name)
    name = name.strip()
    name = _invalid.sub("_", name)
    # nomes reservados do Windows
    reserved = {"CON", "PRN", "AUX", "NUL",
                *(f"COM{i}" for i in range(1, 10)),
                *(f"LPT{i}" for i in range(1, 10))}
    root = name.split(".")[0].upper()
    if root in reserved:
        name = f"_{name}"
    if not keep_dots:
        # evita terminar com ponto/espaço
        name = name.rstrip(" .")
    return name or "_"


def _ensure_dir(p: Path):
    try:
        p.mkdir(parents=True, exist_ok=True)
    except OSError as e:
        if e.errno != errno.EEXIST:
            raise


# ──────────────────────────────────────────────────────────────────────────────
# Sessão HTTP
# ──────────────────────────────────────────────────────────────────────────────
def _new_session() -> requests.Session:
    s = requests.Session()
    # requests (urllib3>=2) já negocia HTTP/2 quando disponível
    return s


# ──────────────────────────────────────────────────────────────────────────────
# Path Builder baseado em dm.path + dm.path_mode
# keys possíveis no seu default: lang, title, volume, group, chapter
# ──────────────────────────────────────────────────────────────────────────────
def _component_for(key: str, job: Dict[str, Any], conn: apsw.Connection) -> Optional[str]:
    """
    Converte uma 'key' em um pedaço de caminho usando os dados do job.
    Pulamos vazios/None.
    """
    match key:
        case "lang":
            v = job.get("idioma")
            return _sanitize(v) if v else None
        case "title":
            v = job.get("projeto")
            return _sanitize(v) if v else None
        case "volume":
            v = job.get("volume")
            if not v or str(v).lower() in {"none", "null", ""}:
                return None
            vv = str(v).strip()
            return _sanitize(f"v{vv}")  # padroniza "v03"
        case "group":
            v = job.get("grupo")
            return _sanitize(v) if v else None
        case "chapter" | "capitulo":
            v = job.get("capitulo")
            return _sanitize(f"{v}") if v else None
        case _:
            v = job.get(key)
            return _sanitize(v) if v else None


def _build_target_dir(conn: apsw.Connection, job: Dict[str, Any]) -> Path:
    root = Path(get_setting(conn, "dm.path", str(Path.home() / "Downloads")) or ".")
    mode: List[Dict[str, Any]] = get_setting(conn, "dm.path_mode", []) or []

    parts: List[str] = []
    for item in mode:
        if not isinstance(item, dict):
            continue
        key = item.get("key")
        en = item.get("enabled", True) or item.get("fixed", False)
        if not en or not key:
            continue
        piece = _component_for(key, job, conn)
        if piece:
            parts.append(piece)

    target = root.joinpath(*parts)
    _ensure_dir(target)
    return target


# ──────────────────────────────────────────────────────────────────────────────
# Core de download
# ──────────────────────────────────────────────────────────────────────────────
def _fetch_chapter_manifest(sess: requests.Session, chapter_id: str) -> Dict[str, Any]:
    lang = get_effective_lang()
    url  = f"https://api.mangadex.org/at-home/server/{chapter_id}"

    dbg_tpl = t(
        lang,
        "workers.downloads.debug.fetching_manifest",
        namespace="app",
        default_value="Buscando manifesto para o capítulo {chapter_id} de {url}"
    )
    logger.debug(dbg_tpl.format(chapter_id=chapter_id, url=url))

    try:
        r = sess.get(url, timeout=REQ_TIMEOUT)
        r.raise_for_status()
        data = r.json()
        if data.get("result") != "ok" or "baseUrl" not in data or "chapter" not in data:
            msg_tpl = t(
                lang,
                "workers.downloads.errors.athome_unexpected",
                namespace="app",
                default_value="Resposta inesperada do At-Home: {data}"
            )
            # usamos repr para preservar estrutura em logs
            raise RuntimeError(msg_tpl.format(data=repr(data)))
        return data
    except Exception:
        # Deixa o traceback completo
        logger.exception(
            t(
                lang,
                "workers.downloads.errors.final_failure",
                namespace="app",
                default_value="Falha definitiva após {attempts} tentativas ao baixar {url}"
            ).format(attempts=1, url=url)
        )
        raise


def _download_file(
    sess: requests.Session,
    url: str,
    dest: Path,
    hb=None,
    *,
    chunk_idx: Optional[int] = None,
):
    """
    Baixa `url` para `dest`. Se `hb` for passado, checa cancelamento periodicamente.
    Escreve em arquivo temporário `.part` e renomeia ao final (atomic move).
    """
    lang = get_effective_lang()
    tmp  = dest.with_suffix(dest.suffix + ".part")

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            with sess.get(url, stream=True, timeout=REQ_TIMEOUT) as r:
                r.raise_for_status()
                _ensure_dir(tmp.parent)
                with open(tmp, "wb") as f:
                    for chunk in r.iter_content(chunk_size=CHUNK_SIZE):
                        if not chunk:
                            # mesmo sem chunk, ainda podemos checar cancelamento
                            if hb and not hb(None):
                                raise Cancelled()
                            continue
                        f.write(chunk)
                        # checa cancelamento com baixa granularidade (por chunk)
                        if hb and not hb(None):
                            raise Cancelled()
            tmp.replace(dest)  # sucesso: commit atômico
            return  # sucesso → sai da função

        except Cancelled:
            # limpeza do parcial
            try:
                tmp.unlink(missing_ok=True)
            except Exception:
                pass
            raise

        except Exception as e:
            if attempt == MAX_RETRIES:
                logger.exception(
                    t(
                        lang,
                        "workers.downloads.errors.final_failure",
                        namespace="app",
                        default_value="Falha definitiva após {attempts} tentativas ao baixar {url}"
                    ).format(attempts=attempt, url=url)
                )
                raise
            warn_tpl = t(
                lang,
                "workers.downloads.errors.retry_warning",
                namespace="app",
                default_value="Tentativa {attempt}/{max} falhou ao baixar {url}: {error}. Retentando em {delay}s..."
            )
            logger.warning(
                warn_tpl.format(
                    attempt=attempt,
                    max=MAX_RETRIES,
                    url=url,
                    error=e,
                    delay=RETRY_DELAY
                )
            )
            time.sleep(RETRY_DELAY)


# ──────────────────────────────────────────────────────────────────────────────
# Entry point do runner
# ──────────────────────────────────────────────────────────────────────────────
def run(conn: apsw.Connection, job: Dict[str, Any], hb):
    """
    Runner de downloads.
    - `conn`: conexão APSW (da thread do worker)
    - `job`: dict da linha da tabela `downloads`
    - `hb`: callback de heartbeat -> hb(bp:int|None)
       - atualiza progress_bp (se informado) e renova lease/updated_at
    """
    lang = get_effective_lang()
    chapter_id = str(job["id"])
    sess = _new_session()

    # check inicial (encerra se já cancelado/expirado)
    if not hb(0):
        raise Cancelled()

    # 1) tenta manifesto em cache
    cached = downloads_get_manifest(conn, chapter_id)
    if cached:
        base_url, ch_hash, files = cached
        logger.debug(
            t(
                lang,
                "workers.downloads.debug.manifest_cache_hit",
                namespace="app",
                default_value="Cache de manifesto do capítulo {chapter_id}: base_url={base_url} hash={hash} arquivos={files}"
            ).format(chapter_id=chapter_id, base_url=base_url, hash=ch_hash, files=len(files))
        )
    else:
        logger.debug(
            t(
                lang,
                "workers.downloads.debug.manifest_cache_miss",
                namespace="app",
                default_value="Cache de manifesto do capítulo {chapter_id} ausente; buscando"
            ).format(chapter_id=chapter_id)
        )
        manifest = _fetch_chapter_manifest(sess, chapter_id)
        base_url = manifest["baseUrl"].rstrip("/")
        ch_hash  = manifest["chapter"]["hash"]
        files    = manifest["chapter"].get("data") or []
        downloads_set_manifest(conn, chapter_id, base_url, ch_hash, files)
        logger.debug(
            t(
                lang,
                "workers.downloads.debug.manifest_fetched",
                namespace="app",
                default_value="Manifesto do capítulo {chapter_id} obtido: base_url={base_url} hash={hash} arquivos={files}"
            ).format(chapter_id=chapter_id, base_url=base_url, hash=ch_hash, files=len(files))
        )

    # 2) URLs modo "data"
    urls = [f"{base_url}/data/{ch_hash}/{fn}" for fn in files]

    # 3) diretório destino
    target_dir = _build_target_dir(conn, job)
    logger.debug(
        t(
            lang,
            "workers.downloads.debug.target_directory",
            namespace="app",
            default_value="Diretório de destino do capítulo {chapter_id}: {target_dir}"
        ).format(chapter_id=chapter_id, target_dir=target_dir)
    )

    # 4) baixar com progresso
    total = max(1, len(urls))
    pad   = max(2, len(str(total)))

    for idx, url in enumerate(urls, start=1):
        # checa antes de iniciar cada arquivo
        if not hb(None):
            raise Cancelled()

        last = url.rsplit("/", 1)[-1]
        _, dot, ext = last.rpartition(".")
        ext = f".{ext}" if dot else ""
        filename = f"{idx:0{pad}d}{ext}"
        dest = target_dir / filename

        logger.debug(
            t(
                lang,
                "workers.downloads.debug.downloading_chunk",
                namespace="app",
                default_value="Baixando parte {idx}/{total} do capítulo {chapter_id} de {url} para {dest}"
            ).format(idx=idx, total=total, chapter_id=chapter_id, url=url, dest=dest)
        )

        # baixa este arquivo (pode levantar Cancelled)
        _download_file(sess, url, dest, hb=hb, chunk_idx=idx)

        # atualiza progresso (basis points) e renova lease; se falhar, aborta
        bp = int(idx * 10_000 / total)
        if not hb(bp):
            raise Cancelled()
