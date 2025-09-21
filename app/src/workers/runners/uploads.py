# app/src/workers/runners/uploads.py
from __future__ import annotations

import os
import time
import json
import shutil
import mimetypes
import requests
import concurrent.futures as cf
from typing import Dict, Any, Optional, List, Tuple
import traceback

import apsw
from natsort import natsorted, ns

from app.src.database.db import get_all_settings, uploads_update_fields, add_upload_log
from app.src.auth.mangadex import get_or_refresh_access_token, AuthError
from app.src.services.upload_preparer import ensure_ready_for_upload
from app.src.SocketIO import socket
from app.src.utils.storage_usage import get_prefetch_usage_bytes
from app.src.services.language import t, get_effective_lang

# ──────────────────────────────────────────────────────────────────────────────
# Constantes/Helpers locais
# ──────────────────────────────────────────────────────────────────────────────
ALLOWED_EXTS = (".jpg", ".jpeg", ".png", ".gif")
SIZE_LIMIT_BYTES = 200 * 1024 * 1024  # 200MB

def _dir_size_bytes(path: str) -> int:
    total = 0
    for root, _, files in os.walk(path):
        for fn in files:
            if os.path.splitext(fn.lower())[1] in ALLOWED_EXTS:
                try:
                    total += os.path.getsize(os.path.join(root, fn))
                except OSError:
                    pass
    return total

def _list_images_ordered(root: str) -> List[str]:
    imgs: List[str] = []
    for dirpath, _, files in os.walk(root):
        for fn in files:
            if os.path.splitext(fn.lower())[1] in ALLOWED_EXTS:
                imgs.append(os.path.join(dirpath, fn))
    imgs = natsorted(
        imgs,
        key=lambda p: os.path.relpath(p, root),
        alg=ns.PATH | ns.IGNORECASE,
    )
    return imgs

def _clamp_bp(v: int) -> int:
    v = int(v or 0)
    return max(0, min(10_000, v))

def _hb_progress(hb, done: int, total: int):
    total = max(1, int(total))
    try:
        hb(_clamp_bp(round(done * 10_000 / total)))
    except Exception:
        pass

def _safe_rmtree(p: Optional[str]):
    if not p:
        return
    try:
        shutil.rmtree(p, ignore_errors=True)
    except Exception:
        pass

def _emit_prefetch_size():
    try:
        socket.emit("prefetch:size", {"bytes": get_prefetch_usage_bytes()})
    except Exception:
        pass

def _parse_groups(grupo_field) -> List[Dict[str, str]]:
    """
    uploads.grupo armazena TEXT. No enqueue salvamos JSON de [{id,name}].
    Aqui aceitamos str(JSON) ou já-lista.
    """
    if not grupo_field:
        return []
    if isinstance(grupo_field, list):
        return [g for g in grupo_field if isinstance(g, dict) and g.get("id")]
    try:
        arr = json.loads(grupo_field)
        if isinstance(arr, list):
            return [g for g in arr if isinstance(g, dict) and g.get("id")]
    except Exception:
        pass
    return []

# Helper de tradução local
def _tr(key: str, default: str, **kwargs) -> str:
    lang = get_effective_lang()
    msg = t(lang, key, namespace="app", default_value=default)
    try:
        return msg.format(**kwargs)
    except Exception:
        return msg

# ──────────────────────────────────────────────────────────────────────────────
# Chamadas HTTP ao MangaDex
# ──────────────────────────────────────────────────────────────────────────────
def _api_url(settings: dict) -> str:
    return (settings.get("api.url") or "https://api.mangadex.org").rstrip("/")

def _get_existing_upload_session(api_base: str, token: str, *, attempts: int) -> Optional[str]:
    """
    Verifica se já existe uma sessão de upload aberta.
    """
    url = f"{api_base}/upload"
    attempts = max(1, attempts)

    for _ in range(attempts):
        try:
            r = requests.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=10)

            if r.status_code == 200:
                try:
                    data = r.json().get("data")
                except Exception:
                    data = None
                if isinstance(data, dict) and data.get("id"):
                    return data["id"]
                return None

            if r.status_code == 404:
                return None

            if r.status_code in (401, 403):
                try:
                    j = r.json()
                    detail = (
                        (j.get("errors") or [{}])[0].get("detail")
                        or j.get("error_description")
                        or r.text
                    )
                except Exception:
                    detail = r.text
                raise RuntimeError(_tr(
                    "workers.uploads.errors.query_session",
                    "Falha ao consultar sessão de upload (HTTP {status}). {detail}",
                    status=r.status_code, detail=detail
                ))

            # outros status → retry
        except requests.exceptions.Timeout:
            time.sleep(2)
        except Exception:
            time.sleep(2)

    return None

def _delete_upload_session(api_base: str, token: str, session_id: str, *, attempts: int) -> None:
    for _ in range(max(1, attempts)):
        try:
            requests.delete(f"{api_base}/upload/{session_id}",
                            headers={"Authorization": f"Bearer {token}"},
                            timeout=10)
            return
        except Exception:
            time.sleep(2)

def _begin_upload_session(api_base: str, token: str, manga_id: str, groups: List[Dict[str, str]], *, attempts: int):
    payload = {
        "groups": [g["id"] for g in groups if g.get("id")],
        "manga": manga_id
    }
    last_err = None
    for _ in range(max(1, attempts)):
        try:
            r = requests.post(
                f"{api_base}/upload/begin",
                headers={"Authorization": f"Bearer {token}"},
                json=payload,
                timeout=30
            )
            if r.ok:
                return r.json().get("data", {}).get("id")
            if r.status_code in (401, 403, 404):
                try:
                    detail = r.json().get("errors", [{}])[0].get("detail") or ""
                except Exception:
                    detail = ""
                msg = {
                    401: _tr("workers.uploads.errors.unauthorized", "Não autorizado. {detail}", detail=detail),
                    403: _tr("workers.uploads.errors.forbidden", "Proibido/expirado. {detail}", detail=detail),
                    404: _tr("workers.uploads.errors.not_found", "Recurso não encontrado. {detail}", detail=detail),
                }.get(r.status_code, _tr("workers.uploads.errors.http", "HTTP {status}", status=r.status_code))
                last_err = RuntimeError(msg)
                break
            last_err = RuntimeError(_tr(
                "workers.uploads.errors.create_session_http",
                "Falha ao criar sessão (HTTP {status})", status=r.status_code
            ))
        except requests.exceptions.Timeout:
            last_err = RuntimeError(_tr("workers.uploads.errors.timeout_begin", "Tempo esgotado criando sessão"))
        except Exception as e:
            last_err = e
        time.sleep(5)
    if last_err:
        raise last_err
    return None

def _upload_one_image(api_base: str, token: str, session_id: str, dir_base: str, filename: str, *, attempts: int) -> Tuple[Optional[str], str]:
    """
    Retorna (file_id, filename). file_id=None => falha.
    """
    path = os.path.join(dir_base, filename)
    mime_type, _ = mimetypes.guess_type(path)

    for attempt in range(1, max(1, attempts) + 1):
        try:
            with open(path, "rb") as fh:
                files = {"file": (filename, fh, mime_type)}
                r = requests.post(
                    f"{api_base}/upload/{session_id}",
                    headers={"Authorization": f"Bearer {token}"},
                    files=files,
                    timeout=(10, 60)
                )
            if r.ok:
                data = r.json().get("data", {})
                if isinstance(data, list):
                    fid = data[0].get("id")
                else:
                    fid = data.get("id")
                return (fid, filename) if fid else (None, filename)
        except requests.exceptions.Timeout:
            pass
        except Exception:
            pass
        time.sleep(min(5, 2 * attempt))

    return None, filename

def _commit_upload(api_base: str, token: str, session_id: str, *, lang: str, title: Optional[str],
                   chapter: Optional[str], volume: Optional[str], schedule_at: Optional[str]) -> Optional[str]:
    # normalizações
    vol_out = volume.lstrip("0") if volume else None
    if chapter and chapter.isdigit():
        chap_out = str(int(chapter))
    else:
        chap_out = chapter

    draft = {
        "volume": vol_out,
        "chapter": chap_out,
        "translatedLanguage": lang,
        "title": title
    }
    if schedule_at:
        draft["publishAt"] = schedule_at

    return draft

# ──────────────────────────────────────────────────────────────────────────────
# Runner principal
# ──────────────────────────────────────────────────────────────────────────────
def run(conn: apsw.Connection, job: Dict[str, Any], hb):
    """
    Campos usados do job (uploads):
        - projeto_id, projeto
        - idioma, titulo, capitulo, volume, one_shot, schedule_at
        - grupo  (JSON TEXT com [{id,name}])
        - path, path_temp
    """
    def log(level: str, message: str, ctx: Optional[Dict[str, Any]] = None,
            *, stage: Optional[str] = None, code: Optional[str] = None):
        add_upload_log(
            conn,
            upload_id=job.get("id"),
            message=message,
            level=level,
            stage=stage,
            code=code,
            data=ctx or {}
        )

    settings = get_all_settings(conn) or {}
    api_base = _api_url(settings)

    finish = False

    up_simul         = int(settings.get("up.simultaneous", 5))
    up_max_retries   = int(settings.get("up.max_retries", 5))
    up_accept_errors = bool(settings.get("up.accept_errors", False))

    tool        = "pillow" if settings.get("tools.cut.pillow", True) else "smartstitch"
    output_type = settings.get("ext.out", ".jpg")
    quality     = int(settings.get("quality.image", 85))

    long_strip = bool(job.get("long_strip"))

    log("info", _tr("workers.uploads.logs.started", "Upload iniciado"), {
        "manga": job.get("projeto"),
        "manga_id": job.get("projeto_id"),
        "lang": job.get("idioma"),
        "long_strip": long_strip,
        "title": job.get("titulo"),
        "chapter": job.get("capitulo"),
        "volume": job.get("volume")
    })

    # 0) token primeiro
    try:
        access_token = get_or_refresh_access_token(conn)
    except AuthError as e:
        log("error", _tr("workers.uploads.errors.auth_failed", "Falha de autenticação"), {"detail": str(e)})
        raise RuntimeError(_tr("workers.uploads.errors.auth_failed_detail", "Falha de autenticação: {error}", error=str(e)))

    # 1) sessão existente? apaga
    old_sid = _get_existing_upload_session(api_base, access_token, attempts=up_max_retries)
    if old_sid:
        log("info", _tr("workers.uploads.logs.old_session_found", "Sessão de upload anterior encontrada — removendo"),
            {"session_id": old_sid})
        _delete_upload_session(api_base, access_token, old_sid, attempts=up_max_retries)

    # 2) cria nova sessão
    manga_id = job.get("projeto_id")
    groups   = _parse_groups(job.get("grupo"))
    if not manga_id:
        msg = _tr("workers.uploads.errors.missing_project_id_session", "projeto_id ausente para criar sessão de upload")
        log("error", msg)
        raise RuntimeError(msg)

    session_id = _begin_upload_session(api_base, access_token, manga_id, groups, attempts=up_max_retries)
    if not session_id:
        msg = _tr("workers.uploads.errors.begin_session_failed", "Não foi possível abrir sessão de upload")
        log("error", msg)
        raise RuntimeError(msg)
    log("info", _tr("workers.uploads.logs.session_created", "Sessão de upload criada"),
        {"session_id": session_id, "groups": [g.get("id") for g in groups]})

    created_now: Optional[str] = None
    try:
        # 3) preparar diretório
        work_dir = ensure_ready_for_upload(
            base_path=job.get("path"),
            path_temp=job.get("path_temp"),
            tool=tool,
            long_strip=long_strip,
            output_type=output_type,
            quality=quality,
            normalize_sequence=True,
        )
        if not work_dir or not os.path.isdir(work_dir):
            _delete_upload_session(api_base, access_token, session_id, attempts=up_max_retries)
            msg = _tr("workers.uploads.errors.workdir_invalid", "Falha ao preparar imagens (work_dir inválido).")
            log("error", msg)
            raise RuntimeError(msg)

        path_raw = job.get("path")
        created_raw = bool(path_raw and os.path.basename(path_raw).startswith("upload_raw_"))

        # se o runner gerou uma pasta nova, guarde p/ limpeza no finally
        origs = {p for p in [job.get("path"), job.get("path_temp")] if p}
        norm_work = os.path.normpath(work_dir)
        if norm_work not in {os.path.normpath(p) for p in origs}:
            created_now = work_dir

        # verificação de cota
        total_bytes = _dir_size_bytes(work_dir)
        if total_bytes >= SIZE_LIMIT_BYTES:
            _delete_upload_session(api_base, access_token, session_id, attempts=up_max_retries)
            log("error",
                _tr("workers.uploads.errors.size_limit_log", "Tamanho total do capítulo excede o limite"),
                {"bytes": total_bytes, "limit": SIZE_LIMIT_BYTES}
            )
            raise RuntimeError(_tr(
                "workers.uploads.errors.size_limit_user",
                "Tamanho total do capítulo excede {limit_mb}MB",
                limit_mb=int(SIZE_LIMIT_BYTES / (1024 * 1024))
            ))

        # 4) lista imagens e envia
        images_abs = _list_images_ordered(work_dir)
        if not images_abs:
            _delete_upload_session(api_base, access_token, session_id, attempts=up_max_retries)
            log("error", _tr("workers.uploads.errors.no_images", "Nenhuma imagem encontrada"), {"dir": work_dir})
            raise RuntimeError(_tr("workers.uploads.errors.no_images", "Nenhuma imagem encontrada"))

        uploads_update_fields(conn, job['id'], {"files_count": len(images_abs)})
        log("info", _tr("workers.uploads.logs.images_ready", "Imagens preparadas"),
            {"count": len(images_abs), "bytes": total_bytes, "work_dir": work_dir})

        images_rel = [os.path.relpath(p, work_dir) for p in images_abs]
        total = len(images_rel)
        _hb_progress(hb, 0, total)

        successful: List[Tuple[str, str]] = []  # (file_id, filename)
        failed: List[str] = []

        def _send_one(relname: str) -> Tuple[Optional[str], str]:
            fid, fname = _upload_one_image(api_base, access_token, session_id, work_dir, relname, attempts=up_max_retries)
            return fid, fname

        max_workers = max(1, min(up_simul, total))
        done = 0
        with cf.ThreadPoolExecutor(max_workers=max_workers) as ex:
            futures = [ex.submit(_send_one, rel) for rel in images_rel]
            for f in cf.as_completed(futures):
                fid, fname = f.result()
                if fid:
                    successful.append((fid, fname))
                else:
                    failed.append(fname)
                    log("warning", _tr("workers.uploads.logs.upload_image_failed", "Falha ao enviar imagem"),
                        {"file": fname})
                done += 1
                _hb_progress(hb, done, total)

        if failed and not up_accept_errors:
            _delete_upload_session(api_base, access_token, session_id, attempts=up_max_retries)
            err_msg = _tr(
                "workers.uploads.errors.images_failed_count",
                "{count} imagem(ns) falharam no upload",
                count=len(failed)
            )
            log("error",
                _tr("workers.uploads.errors.policy_blocked", "Falhas de upload e política não permite continuar"),
                {"failed_count": len(failed), "examples": failed[:5]}
            )
            try:
                uploads_update_fields(conn, job["id"], {
                    "status": "canceled",
                    "last_error": err_msg,
                })
                log("info",
                    _tr("workers.uploads.logs.marked_canceled", "Upload marcado como 'canceled' por falhas de imagem"),
                    {"upload_id": job.get("id"), "failed_count": len(failed)}
                )
            except Exception:
                pass
            raise RuntimeError(err_msg)

        # 6) commit
        successful = natsorted(successful, key=lambda x: x[1], alg=ns.PATH | ns.IGNORECASE)
        page_order = [fid for (fid, _) in successful]

        chapter_draft = _commit_upload(
            api_base, access_token, session_id,
            lang=job.get("idioma"),
            title=job.get("titulo"),
            chapter=job.get("capitulo"),
            volume=job.get("volume"),
            schedule_at=job.get("schedule_at"),
        )

        log("info", _tr("workers.uploads.logs.sending_commit", "Enviando commit"), {
            "images_ok": len(page_order),
            "lang": job.get("idioma"),
            "title": job.get("titulo"),
            "chapter": job.get("capitulo"),
            "volume": job.get("volume"),
            "schedule_at": job.get("schedule_at")
        })

        r = requests.post(
            f"{api_base}/upload/{session_id}/commit",
            headers={"Authorization": f"Bearer {access_token}"},
            json={"chapterDraft": chapter_draft, "pageOrder": page_order},
            timeout=20
        )
        if not r.ok:
            try:
                body = r.json()
            except Exception:
                body = r.text
            log("error", _tr("workers.uploads.errors.commit_failed_log", "Commit falhou"),
                {"status": r.status_code, "body": body})
            raise RuntimeError(_tr(
                "workers.uploads.errors.commit_failed_user",
                "Commit falhou (HTTP {status}): {body}",
                status=r.status_code, body=body
            ))

        finish = True

        try:
            jid = r.json().get("data", {}).get("id")
        except Exception:
            jid = None
        log("info", _tr("workers.uploads.logs.commit_done", "Commit concluído"),
            {"status": r.status_code, "chapter_id": jid})

        _hb_progress(hb, total, total)  # 100%

    finally:
        if finish:
            # 7) limpeza
            removed_temp = False
            removed_generated = False
            removed_raw = False

            if job.get("path_temp"):
                _safe_rmtree(job.get("path_temp"))
                removed_temp = True
                _emit_prefetch_size()

            if created_now:
                _safe_rmtree(created_now)
                removed_generated = True

            if 'created_raw' in locals() and created_raw:
                _safe_rmtree(path_raw)
                removed_raw = True

            log("info", _tr("workers.uploads.logs.cleanup_done", "Limpeza de temporários concluída"), {
                "removed_temp": removed_temp,
                "removed_generated": removed_generated,
                "removed_raw": removed_raw,
            })
