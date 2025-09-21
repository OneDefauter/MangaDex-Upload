import os, json
from pathlib import Path
from typing import Dict, Any, Iterable, Optional, Tuple

# --- Paths iguais ao projeto original ---------------------------------------
USER_PATH = os.path.join(os.path.expanduser("~"), "MangaDex Upload Settings")
LANG_FILE = Path(USER_PATH, "lang.txt")
LANG_DIR  = Path(__file__).resolve().parent / "app" / "src" / "lang"
DEFAULT_LANG = "en"

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
    return out  # ex.: ['pt-br','pt','en']

def get_effective_lang(default: str = DEFAULT_LANG) -> str:
    env = os.environ.get("APP_LANG")
    if env:
        return _normalize(env)
    try:
        if LANG_FILE.exists():
            return _normalize(LANG_FILE.read_text(encoding="utf-8").strip())
    except Exception:
        pass
    return _normalize(default)

def set_persisted_lang(lang: str) -> None:
    try:
        Path(USER_PATH).mkdir(parents=True, exist_ok=True)
        LANG_FILE.write_text(_normalize(lang), encoding="utf-8")
    except Exception:
        pass

# cache: {(lang_norm, ns): data}
_CACHE: Dict[Tuple[str, str], Dict[str, Any]] = {}

def _load_json(path: Path) -> Dict[str, Any]:
    try:
        if path.exists():
            with path.open(encoding="utf-8") as f:
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

def load_namespace(lang: str, namespace: str) -> Dict[str, Any]:
    lang = _normalize(lang)
    key = (lang, namespace)
    if key in _CACHE:
        return _CACHE[key]

    data: Dict[str, Any] = {}
    # Merge na ordem do mais genérico para o mais específico (en -> pt -> pt-br)
    chain = list(_fallback_chain(lang))
    for code in reversed(chain):
        data = _deep_merge(data, _load_json(LANG_DIR / code / f"{namespace}.json"))
    _CACHE[key] = data
    return data

def _walk_key(d: Dict[str, Any], dotted: str) -> Optional[Any]:
    cur: Any = d
    for part in dotted.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return None
        cur = cur[part]
    return cur

def t(lang: str, key: str, *, namespace="app", default_value=None, **kw) -> str:
    data = load_namespace(lang, namespace)
    val = _walk_key(data, key)
    if val is None:
        # placeholder "seguro" para não quebrar .format()
        return default_value if default_value is not None else "{{" + key + "}}"
    # Não fazemos .format() aqui para manter compat com seu uso externo
    return str(val)
