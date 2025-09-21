from __future__ import annotations
import json
from pathlib import Path
from typing import Dict, Any, Iterable, Optional, Tuple
from app.src.path import LANG_FILE

# diretório base dos idiomas
LANG_DIR = Path(__file__).resolve().parent.parent / "lang"

# namespaces padrão (podem ser alterados)
NAMESPACES = ("app", "web", "script")

# fallback global
DEFAULT_LANG = "en"

# ───────────────────────────────────────────────────────────
# Normalização, fallback e utilitários de JSON (como antes)
# ───────────────────────────────────────────────────────────
def _normalize(lang: str) -> str:
    return (lang or "").strip().replace("_", "-").lower() or DEFAULT_LANG

def _fallback_chain(lang: str, default: str = DEFAULT_LANG) -> Iterable[str]:
    lang = _normalize(lang)
    parts = [p for p in lang.split("-") if p]
    chain = ["-".join(parts[:i]) for i in range(len(parts), 0, -1)]
    if default and default not in chain:
        chain.append(_normalize(default))
    seen, out = set(), []
    for c in chain:
        if c and c not in seen:
            seen.add(c)
            out.append(c)
    return out

def _ns_path(lang: str, namespace: str) -> Path:
    return LANG_DIR / lang / f"{namespace}.json"

def _load_json(path: Path) -> Dict[str, Any]:
    try:
        if path.exists():
            with path.open("r", encoding="utf-8") as f:
                return json.load(f) or {}
    except Exception:
        pass
    return {}

def _deep_merge(base: Dict[str, Any], over: Dict[str, Any]) -> Dict[str, Any]:
    for k, v in over.items():
        if isinstance(v, dict) and isinstance(base.get(k), dict):
            _deep_merge(base[k], v)
        else:
            base[k] = v
    return base

def _sum_mtime(paths: Iterable[Path]) -> float:
    total = 0.0
    for p in paths:
        try:
            if p.exists():
                total += p.stat().st_mtime
        except OSError:
            pass
    return total

# cache: (lang_norm, namespace) -> (mtimes_sum, data)
_CACHE: Dict[Tuple[str, str], Tuple[float, Dict[str, Any]]] = {}

def clear_cache():
    _CACHE.clear()

# ──────────────────────────────────────────────
# NOVO: persistência/recuperação do idioma
# ──────────────────────────────────────────────
def get_persisted_lang(default: str = DEFAULT_LANG) -> str:
    """
    Lê o idioma persistido em LANG_FILE. Retorna 'default' se não existir.
    """
    try:
        if LANG_FILE.exists():
            txt = LANG_FILE.read_text(encoding="utf-8").strip()
            return _normalize(txt or default)
    except Exception:
        pass
    return _normalize(default)

def set_persisted_lang(lang: str) -> None:
    """
    Salva o idioma normalizado em LANG_FILE. Cria a pasta se necessário.
    Silencioso em caso de erro (não derruba a app).
    """
    try:
        LANG_FILE.parent.mkdir(parents=True, exist_ok=True)
        LANG_FILE.write_text(_normalize(lang), encoding="utf-8")
    except Exception:
        pass

def get_effective_lang(default: str = DEFAULT_LANG) -> str:
    """
    Tenta obter o idioma atual a partir de flask.g.user_language.
    Se não houver contexto do Flask (ou g não definido), usa o arquivo persistido.
    """
    # Import local para não criar dependência dura na importação do módulo
    try:
        from flask import g  # type: ignore
        lang = getattr(g, "user_language", None)
        if lang:
            return _normalize(lang)
    except Exception:
        # Sem request context ou sem Flask
        pass
    return get_persisted_lang(default=default)

# ──────────────────────────────────────────────
# Carregamento de bundles/namespace e t()
# ──────────────────────────────────────────────
def load_namespace(lang: str, namespace: str, *, debug: bool = False, default: str = DEFAULT_LANG) -> Dict[str, Any]:
    """
    Carrega um namespace (ex.: 'app') seguindo a cadeia de fallback.
    Ordem de merge: genérico → específico (ex.: en -> pt -> pt-br).
    """
    lang = _normalize(lang)
    chain = list(_fallback_chain(lang, default=default))  # ex.: ['pt-br','pt','en']
    merge_order = list(reversed(chain))                   # ex.: ['en','pt','pt-br']

    key = (lang, namespace)
    files = [_ns_path(code, namespace) for code in merge_order]
    mtimes = _sum_mtime(files) if debug else 0.0

    if not debug and key in _CACHE:
        return _CACHE[key][1]
    if debug and key in _CACHE and abs(_CACHE[key][0] - mtimes) < 1e-9:
        return _CACHE[key][1]

    data: Dict[str, Any] = {}
    for code in merge_order:
        chunk = _load_json(_ns_path(code, namespace))
        if chunk:
            _deep_merge(data, chunk)

    _CACHE[key] = (mtimes, data)
    return data

def load_bundles(lang: str, *, debug: bool = False, default: str = DEFAULT_LANG) -> Dict[str, Dict[str, Any]]:
    return {ns: load_namespace(lang, ns, debug=debug, default=default) for ns in NAMESPACES}

def _walk_key(d: Dict[str, Any], dotted: str) -> Optional[Any]:
    cur: Any = d
    for part in dotted.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return None
        cur = cur[part]
    return cur

def t(lang: str, key: str, *, namespace: str = "app", default_value: Optional[str] = None,
      debug: bool = False, fallback_default: str = DEFAULT_LANG) -> str:
    data = load_namespace(lang, namespace, debug=debug, default=fallback_default)
    val = _walk_key(data, key)
    if val is None:
        return default_value if default_value is not None else "{" + key + "}"
    return str(val)