from __future__ import annotations
import os, shutil, tempfile, uuid, zipfile, math
from dataclasses import dataclass, field
from typing import List, Optional, Iterable
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename
from PIL import Image
from natsort import natsorted, ns

from app.src.utils.SmartStitch.process import ConsoleStitchProcess  # SmartStitch
from app.src.SocketIO import socket
from app.src.utils.storage_usage import get_prefetch_usage_bytes
from app.src.services.language import t, get_effective_lang

# ──────────────────────────────────────────────────────────────────────────────
# i18n helper
# ──────────────────────────────────────────────────────────────────────────────
def _tr(key: str, default: str) -> str:
    """Atalho para tradução no namespace 'app'."""
    lang = get_effective_lang()
    return t(lang, key, namespace="app", default_value=default)

# ──────────────────────────────────────────────────────────────────────────────
# Constantes
# ──────────────────────────────────────────────────────────────────────────────
ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
ALLOWED_ARCHIVES = {".zip", ".cbz"}
SIZE_LIMIT_BYTES = 200 * 1024 * 1024  # 200 MB
TALL_LIMIT_PX   = 10_000
SPLIT_TARGET_PX = 5000

# ──────────────────────────────────────────────────────────────────────────────
# Helpers básicos
# ──────────────────────────────────────────────────────────────────────────────
def _ext_ok(name: str) -> bool:
    _, ext = os.path.splitext(name.lower())
    return ext in ALLOWED_EXTS

def _is_archive_name(name: str) -> bool:
    _, ext = os.path.splitext(name.lower())
    return ext in ALLOWED_ARCHIVES

def _ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)

def _walk_images_in_path(path: str) -> List[str]:
    out: List[str] = []
    for root, _, files in os.walk(path):
        for fn in files:
            if _ext_ok(fn):
                out.append(os.path.join(root, fn))
    return out

def _sum_sizes(paths: Iterable[str]) -> int:
    total = 0
    for p in paths:
        try:
            total += os.path.getsize(p)
        except OSError:
            pass
    return total

def _dir_size_bytes(path: str) -> int:
    return _sum_sizes(_walk_images_in_path(path))

def _scan_tall_images(root: str) -> List[str]:
    tall: List[str] = []
    for src in _walk_images_in_path(root):
        try:
            with Image.open(src) as im:
                if im.height > TALL_LIMIT_PX:
                    tall.append(os.path.relpath(src, root))
        except Exception:
            pass
    return tall

def _save_pillow_image(im: Image.Image, dst: str, *, quality: int = 85):
    ext = os.path.splitext(dst)[1].lower()
    if ext in (".jpg", ".jpeg"):
        if im.mode not in ("RGB", "L"):
            im = im.convert("RGB")
        im.save(dst, format="JPEG", quality=quality, optimize=True)
    elif ext == ".png":
        im.save(dst, format="PNG", optimize=True)
    elif ext == ".gif":
        im.save(dst, format="GIF")
    elif ext == ".webp":
        # converte para WEBP quando desejado
        if im.mode not in ("RGB", "RGBA", "L"):
            im = im.convert("RGB")
        im.save(dst, format="WEBP", quality=quality, method=6)
    else:
        im.save(dst)

def _looks_like_image(path: str) -> bool:
    if not _ext_ok(path):
        return False
    try:
        with Image.open(path) as im:
            im.verify()
        return True
    except Exception:
        return False

def _basename_from_browser_filename(name: str) -> str:
    name = (name or "").replace("\\", "/")
    return os.path.basename(name)

def _unique_path(dst_dir: str, filename: str) -> str:
    # permite manter subpastas em filename
    folder, file = os.path.split(filename)
    base, ext = os.path.splitext(file)
    cand = file
    n = 1
    while os.path.exists(os.path.join(dst_dir, folder, cand)):
        cand = f"{base}_{n}{ext}"
        n += 1
    return os.path.join(dst_dir, folder, cand)

# ──────────────────────────────────────────────────────────────────────────────
# Helpers reutilizáveis (sem estado)
# ──────────────────────────────────────────────────────────────────────────────
def compute_metrics(root: str):
    files_count = len(_walk_images_in_path(root))
    total_bytes = _dir_size_bytes(root)
    tall_list   = _scan_tall_images(root)
    oversize    = total_bytes > SIZE_LIMIT_BYTES
    return files_count, total_bytes, oversize, tall_list

def flatten_and_renumber(root: str, subdir: str = "pages") -> str:
    """
    Move todas as imagens de `root` para `root/subdir`, ordenando naturalmente
    e renomeando para 001.ext, 002.ext, ... Retorna o caminho final.
    """
    rel_key = lambda p: os.path.relpath(p, root)

    imgs = natsorted(
        _walk_images_in_path(root),
        key=rel_key,
        alg=ns.PATH | ns.IGNORECASE
    )
    if not imgs:
        return root

    target = os.path.join(root, subdir)
    _ensure_dir(target)

    pad = max(3, len(str(len(imgs))))

    for i, src in enumerate(imgs, 1):
        ext = os.path.splitext(src)[1].lower()
        dst_name = f"{i:0{pad}d}{ext}"
        dst = os.path.join(target, dst_name)
        _ensure_dir(os.path.dirname(dst))
        if os.path.normpath(src) == os.path.normpath(dst):
            continue
        shutil.move(src, dst)

    # remove subpastas vazias
    for dirpath, _, _ in os.walk(root, topdown=False):
        if os.path.normpath(dirpath) == os.path.normpath(target):
            continue
        try:
            if not os.listdir(dirpath):
                os.rmdir(dirpath)
        except Exception:
            pass

    return target

def process_into_outdir(
    input_folder: str,
    out_dir: str,
    *,
    tool: str = "pillow",
    long_strip: bool = False,
    output_type: str = ".jpg",
    quality: int = 85,
    normalize_sequence: bool = True,
    ss_split_height: int = 5000,
    ss_detection_type: str = "pixel",
    ss_detection_sensitivity: int = 90,
    ss_ignorable_pixels: int = 5,
    ss_scan_line_step: int = 5,
) -> str:
    """
    Materializa em `out_dir` a pasta pronta para upload. Retorna o caminho final
    (pode ser `out_dir/pages` se `normalize_sequence=True`).
    """
    _ensure_dir(out_dir)

    if tool.lower() == "smartstitch" and long_strip:
        kwargs = {
            "input_folder": input_folder,
            "output_folder": out_dir,
            "split_height": ss_split_height,
            "output_type": output_type,
            "custom_width": -1,
            "detection_type": ss_detection_type,
            "detection_senstivity": ss_detection_sensitivity,  # (sic) mantém nome esperado pelo SmartStitch
            "lossy_quality": quality,
            "ignorable_pixels": ss_ignorable_pixels,
            "scan_line_step": ss_scan_line_step,
        }
        process = ConsoleStitchProcess()
        process.run(kwargs)

    else:
        # Pillow path
        srcs = _walk_images_in_path(input_folder)
        srcs = natsorted(
            srcs,
            key=lambda p: os.path.relpath(p, input_folder),
            alg=ns.PATH | ns.IGNORECASE
        )

        # sempre gerar no formato de saída configurado
        out_ext = (output_type or ".jpg").lower()

        for src in srcs:
            rel = os.path.relpath(src, input_folder)
            rel_dir = os.path.dirname(rel)
            base_name, _src_ext = os.path.splitext(os.path.basename(rel))
            dst_dir = os.path.join(out_dir, rel_dir)
            _ensure_dir(dst_dir)

            with Image.open(src) as im:
                width, height = im.size

                if height > TALL_LIMIT_PX:
                    parts = max(2, min(10, math.ceil(height / SPLIT_TARGET_PX)))
                    step = height // parts
                    digits = max(2, len(str(parts)))
                    for i in range(parts):
                        top = i * step
                        bottom = height if i == parts - 1 else (i + 1) * step
                        tile = im.crop((0, top, width, bottom))
                        part_name = f"{base_name}-{i+1:0{digits}d}{out_ext}"
                        dst = os.path.join(dst_dir, part_name)
                        _save_pillow_image(tile, dst, quality=quality)
                else:
                    src_ext = _src_ext.lower()

                    # Copiar só se:
                    # 1) NÃO for webp (webp deve ser convertido)
                    # 2) A saída pedir o MESMO formato da origem (evita recompressão desnecessária)
                    can_copy = (src_ext in {".jpg", ".jpeg", ".png", ".gif"}) and (src_ext == out_ext)

                    if can_copy:
                        # mantém subpastas e o nome de arquivo original
                        dst = os.path.join(dst_dir, base_name + src_ext)
                        _ensure_dir(os.path.dirname(dst))
                        shutil.copy2(src, dst)
                    else:
                        # converte para o formato de saída configurado (inclui webp -> jpg/png/gif)
                        dst = os.path.join(dst_dir, base_name + out_ext)
                        _save_pillow_image(im, dst, quality=quality)

    return flatten_and_renumber(out_dir) if normalize_sequence else out_dir

def ensure_ready_for_upload(
    *,
    base_path: str,
    path_temp: Optional[str],
    tool: str,
    long_strip: bool,
    output_type: str,
    quality: int,
    normalize_sequence: bool = True,
    ss_split_height: int = 5000,
    ss_detection_type: str = "pixel",
    ss_detection_sensitivity: int = 90,
    ss_ignorable_pixels: int = 5,
    ss_scan_line_step: int = 5,
) -> str:
    """
    Worker helper. Se já houver prefetch válido (path_temp), usa.
    Caso contrário, processa `base_path` para uma pasta pronta e retorna o caminho.
    """
    if path_temp and os.path.isdir(path_temp) and _walk_images_in_path(path_temp):
        return path_temp
    out_dir = tempfile.mkdtemp(prefix="upload_ready_")
    return process_into_outdir(
        base_path, out_dir, tool=tool, long_strip=long_strip,
        output_type=output_type, quality=quality,
        normalize_sequence=normalize_sequence,
        ss_split_height=ss_split_height,
        ss_detection_type=ss_detection_type,
        ss_detection_sensitivity=ss_detection_sensitivity,
        ss_ignorable_pixels=ss_ignorable_pixels,
        ss_scan_line_step=ss_scan_line_step,
    )

# ──────────────────────────────────────────────────────────────────────────────
# API pública
# ──────────────────────────────────────────────────────────────────────────────
@dataclass
class PreparedResult:
    ok: bool
    error: Optional[str] = None
    path: Optional[str] = None
    path_temp: Optional[str] = None
    files_count: int = 0
    total_bytes: int = 0
    over_size_limit: bool = False
    tall_images: List[str] = field(default_factory=list)

class UploadPreparer:
    """
    Converte arquivos/pasta/zip em:
      - base_path   = pasta RAW no servidor (sempre presente)
      - path_temp   = pasta PRONTA (prefetch) se habilitado
    Métricas são sempre computadas sobre (path_temp ou base_path).
    """
    def __init__(
        self,
        *,
        files: Optional[Iterable[FileStorage]] = None,
        path: Optional[str] = None,
        use_prefetch: bool = False,
        long_strip: bool = False,
        tool: str = "pillow",               # "pillow" | "smartstitch"
        output_type: str = ".jpg",
        quality: int = 85,
        normalize_sequence: bool = True,
        ss_split_height: int = 5000,
        ss_detection_type: str = "pixel",
        ss_detection_sensitivity: int = 90,
        ss_ignorable_pixels: int = 5,
        ss_scan_line_step: int = 5,
    ):
        self._files   = list(files or [])
        self._path_in = (path or "").strip()
        self._use_prefetch = bool(use_prefetch)
        self._long_strip = bool(long_strip)
        self._tool = (tool or "pillow").lower()
        self._normalize_sequence = bool(normalize_sequence)

        # SmartStitch params
        self.ss_split_height = ss_split_height
        self.ss_output_type  = output_type
        self.ss_detection_type = ss_detection_type
        self.ss_detection_sensitivity = ss_detection_sensitivity
        self.ss_ignorable_pixels = ss_ignorable_pixels
        self.ss_scan_line_step = ss_scan_line_step
        self.ss_quality = quality

        self._temp_created: List[str] = []

    # -------------------------------------------------------------------------
    def prepare(self) -> PreparedResult:
        try:
            # 1) origem: PATH ou FILES (com suporte a zip)
            if self._path_in:
                if os.path.isdir(self._path_in):
                    base_path = self._path_in
                elif os.path.isfile(self._path_in) and _is_archive_name(self._path_in):
                    raw = self._mktemp(prefix="upload_raw_")
                    self._extract_zip(self._path_in, os.path.join(raw, "archive"))
                    base_path = raw
                else:
                    return PreparedResult(
                        ok=False,
                        error=_tr("services.upload_preparer.errors.invalid_path",
                                  "Invalid path (must be a directory or .zip/.cbz).")
                    )

                if not _walk_images_in_path(base_path):
                    return PreparedResult(
                        ok=False,
                        error=_tr("services.upload_preparer.errors.no_supported_images",
                                  "No supported images found (JPEG/JPG/PNG/GIF/WEBP).")
                    )
            else:
                if not self._files:
                    return PreparedResult(
                        ok=False,
                        error=_tr("services.upload_preparer.errors.no_files", "No files sent.")
                    )
                base_path = self._ingest_files_to_temp_raw(self._files)
                if not _walk_images_in_path(base_path):
                    return PreparedResult(
                        ok=False,
                        error=_tr("services.upload_preparer.errors.files_no_supported_images",
                                  "Uploaded files do not contain supported images (JPEG/JPG/PNG/GIF/WEBP).")
                    )

            # 2) prefetch opcional
            out_temp = None
            if self._use_prefetch:
                out_temp = self._prefetch(base_path)

            # 3) métricas (pasta que o worker usará)
            metrics_root = out_temp or base_path
            files_count, total_bytes, oversize, tall_list = compute_metrics(metrics_root)

            return PreparedResult(
                ok=True,
                path=base_path,
                path_temp=out_temp,
                files_count=files_count,
                total_bytes=total_bytes,
                over_size_limit=oversize,
                tall_images=tall_list,
            )

        except Exception as e:
            self._cleanup_on_error()
            return PreparedResult(
                ok=False,
                error=_tr("services.upload_preparer.errors.prepare_failed",
                          "Failed to prepare upload: {error}").format(error=str(e))
            )

    # -------------------------------------------------------------------------
    # ingest: FILES -> temp raw (salva imagens e extrai zips)
    def _ingest_files_to_temp_raw(self, files: Iterable[FileStorage]) -> str:
        raw_dir = self._mktemp(prefix="upload_raw_")
        _ensure_dir(raw_dir)

        zip_targets: List[str] = []

        for f in files:
            if not f or not getattr(f, "filename", None):
                continue
            raw_name = _basename_from_browser_filename(f.filename)

            if _ext_ok(raw_name):
                name = secure_filename(raw_name) or f"img_{uuid.uuid4().hex}.jpg"
                out  = _unique_path(raw_dir, name)
                f.save(out)
                if not _looks_like_image(out):
                    try:
                        os.remove(out)
                    except OSError:
                        pass

            elif _is_archive_name(raw_name):
                name = secure_filename(raw_name) or f"arc_{uuid.uuid4().hex}.zip"
                arc_path = _unique_path(raw_dir, name)
                f.save(arc_path)
                zip_targets.append(arc_path)

        for arc in zip_targets:
            sub = os.path.join(raw_dir, os.path.splitext(os.path.basename(arc))[0])
            self._extract_zip(arc, sub)
            try:
                os.remove(arc)
            except OSError:
                pass

        return raw_dir

    # extração segura de zip
    def _extract_zip(self, archive_path: str, out_dir: str) -> None:
        _ensure_dir(out_dir)
        with zipfile.ZipFile(archive_path) as zf:
            for info in zf.infolist():
                if info.is_dir():
                    continue
                norm = os.path.normpath(info.filename.replace("\\", "/"))
                if norm.startswith("../") or os.path.isabs(norm):
                    continue  # ZipSlip protection
                if not _ext_ok(norm):
                    continue
                safe_rel = "/".join(secure_filename(p) for p in norm.split("/"))
                dst = _unique_path(out_dir, safe_rel)
                _ensure_dir(os.path.dirname(dst))
                with zf.open(info, "r") as src, open(dst, "wb") as fh:
                    shutil.copyfileobj(src, fh)

    # prefetch (SmartStitch ou Pillow) – usa a rotina compartilhada
    def _prefetch(self, input_folder: str) -> str:
        out_dir = self._mktemp(prefix="upload_prefetch_")
        final_dir = process_into_outdir(
            input_folder, out_dir,
            tool=self._tool,
            long_strip=self._long_strip,
            output_type=self.ss_output_type,
            quality=self.ss_quality,
            normalize_sequence=self._normalize_sequence,
            ss_split_height=self.ss_split_height,
            ss_detection_type=self.ss_detection_type,
            ss_detection_sensitivity=self.ss_detection_sensitivity,
            ss_ignorable_pixels=self.ss_ignorable_pixels,
            ss_scan_line_step=self.ss_scan_line_step,
        )
        socket.emit("prefetch:size", {"bytes": get_prefetch_usage_bytes()})
        return final_dir

    # housekeeping
    def _mktemp(self, prefix="upload_") -> str:
        tdir = tempfile.mkdtemp(prefix=prefix)
        self._temp_created.append(tdir)
        return tdir

    def _cleanup_on_error(self):
        for d in reversed(self._temp_created):
            try:
                shutil.rmtree(d, ignore_errors=True)
            except Exception:
                pass
        self._temp_created.clear()
