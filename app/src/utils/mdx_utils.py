from __future__ import annotations
from typing import Dict, List, Any, Optional
from math import inf
import time
import httpx

# Base pública padrão do MangaDex
MDX_API_BASE = "https://api.mangadex.org"

# ── Helpers de apresentação ──────────────────────────────────────────────────

def build_cover_url(manga_id: str, file_name: str, cv_quality: int = 1) -> str:
    """
    1 = original | 2 = .512.jpg | 3 = .256.jpg
    """
    if not file_name:
        return ""
    base = f"https://uploads.mangadex.org/covers/{manga_id}/{file_name}"
    if cv_quality == 2:
        return base + ".512.jpg"
    if cv_quality == 3:
        return base + ".256.jpg"
    return base


def pick_title(attr_title: Dict[str, str] | None, alt_titles: List[Dict[str, str]] | None) -> str:
    """tenta pt-br > pt > en > ja-ro > ja > primeiro disponível"""
    attr_title = attr_title or {}
    alt_titles = alt_titles or []
    keys = ["pt-br", "pt", "en", "ja-ro", "ja"]
    for k in keys:
        if k in attr_title:
            return attr_title[k]
    for k in keys:
        hit = next((o[k] for o in alt_titles if isinstance(o, dict) and k in o), None)
        if hit:
            return hit
    return next(iter(attr_title.values()), "Sem título")


def parse_people(relationships: List[Dict[str, Any]] | None, kind: str) -> List[str]:
    """Extrai nomes de relationships por tipo ('author'|'artist')"""
    out: List[str] = []
    for rel in relationships or []:
        if rel.get("type") == kind:
            nm = (rel.get("attributes") or {}).get("name")
            if nm:
                out.append(nm)
    seen, dedup = set(), []
    for n in out:
        if n not in seen:
            seen.add(n)
            dedup.append(n)
    return dedup


def parse_cover_filename(relationships: List[Dict[str, Any]] | None) -> str:
    for rel in relationships or []:
        if rel.get("type") == "cover_art":
            fn = (rel.get("attributes") or {}).get("fileName")
            if fn:
                return fn
    return ""


def tag_names(tags: List[Dict[str, Any]] | None) -> List[str]:
    """Cada tag tem attributes.name com chaves de idioma"""
    out: List[str] = []
    for t in tags or []:
        if not isinstance(t, dict):
            continue
        names = (t.get("attributes") or {}).get("name") or {}
        for k in ("pt-br", "en"):
            if k in names:
                out.append(names[k])
                break
        else:
            if names:
                out.append(next(iter(names.values())))
    return out


def group_objects(rels: List[Dict[str, Any]] | None) -> List[Dict[str, str]]:
    """Converte relationships de grupo em [{id,name}] sem duplicados"""
    out: List[Dict[str, str]] = []
    seen = set()
    for r in rels or []:
        if r.get("type") == "scanlation_group":
            gid = r.get("id")
            nm = (r.get("attributes") or {}).get("name") or gid
            if gid and gid not in seen:
                seen.add(gid)
                out.append({"id": gid, "name": nm})
    return out

# Úteis para rotas de download/edição
def group_names_from_relationships(rels: List[Dict[str, Any]] | None) -> str | None:
    """Retorna nomes de grupos unidos por ' & ' (ou None)."""
    names = [g["name"] for g in group_objects(rels)]
    return " & ".join(dict.fromkeys(names)) if names else None

def safe_str(x):
    return None if x in (None, "") else str(x)

# ── Helpers de capítulos (ordenação/agrupamento) ─────────────────────────────

def safe_chapter_number(ch: str):
    """Converte '10.5' -> 10.5; None/'' vira +inf (vai pro fim)."""
    if ch is None or ch == "":
        return inf
    try:
        return float(ch)
    except Exception:
        num = ""
        for c in str(ch):
            if (c.isdigit() or c == ".") and not (c == "." and (not num or num.endswith("."))):
                num += c
            else:
                break
        try:
            return float(num) if num else inf
        except Exception:
            return inf


def group_chapters(chapters: List[Dict[str, Any]]):
    """
    Agrupa capítulos por idioma -> volume, ordenando por volume desc e capítulo desc.
    Retorna { lang: { vol: [rows...] } }
    """
    from collections import defaultdict

    by_lang = defaultdict(lambda: defaultdict(list))
    for item in chapters:
        attrs = item.get("attributes") or {}
        lang = attrs.get("translatedLanguage") or "unknown"
        vol = attrs.get("volume") or "—"
        row = {
            "id": item.get("id"),
            "vol": vol,
            "ch": attrs.get("chapter"),
            "title": attrs.get("title"),
            "readableAt": attrs.get("readableAt"),
            "externalUrl": attrs.get("externalUrl"),
            "groups": [
                rel.get("attributes", {}).get("name")
                for rel in item.get("relationships", []) or []
                if rel.get("type") == "scanlation_group" and rel.get("attributes")
            ],
        }
        by_lang[lang][vol].append(row)

    def vol_key(v):
        if v == "—":
            return (-inf, True)
        try:
            return (float(v), False)
        except Exception:
            return (-inf, True)

    for lang, vols in by_lang.items():
        for vol, rows in vols.items():
            rows.sort(key=lambda r: (safe_chapter_number(r["ch"])), reverse=True)
        by_lang[lang] = dict(sorted(vols.items(), key=lambda kv: vol_key(kv[0]), reverse=True))

    return by_lang

# ── Helpers de rede / infra ──────────────────────────────────────────────────

def get_api_base(settings: Dict[str, Any] | None) -> str:
    """Lê `api.url` das settings, com fallback para a pública."""
    settings = settings or {}
    return settings.get("api.url") or MDX_API_BASE


def make_user_agent(name: str = "MangaDex Uploader", version: str = "1.0") -> Dict[str, str]:
    return {"User-Agent": f"{name}/{version}"}


def auth_headers(token: str, *, ua: Optional[Dict[str, str]] = None) -> Dict[str, str]:
    """Headers com Authorization + User-Agent."""
    h = dict(ua or make_user_agent())
    h["Authorization"] = f"Bearer {token}"
    return h


def retryable_get(cli: httpx.Client, url: str, *, params=None, headers=None,
                  tries: int = 3, backoff: float = 0.75) -> httpx.Response:
    """GET com retry simples para 429/5xx."""
    for k in range(tries):
        r = cli.get(url, params=params, headers=headers)
        if r.status_code in (429, 500, 502, 503, 504):
            if k == tries - 1:
                r.raise_for_status()
            time.sleep(backoff * (2 ** k))
            continue
        r.raise_for_status()
        return r
    return r  # appease type-checkers

# Busca todos os capítulos (paginado, 100 por página)
def fetch_all_chapters(client: httpx.Client, api_base: str, manga_id: str, *, langs_filter: List[str] | None = None):
    all_items: List[Dict[str, Any]] = []
    limit = 100
    offset = 0

    while True:
        params = [
            ("manga", manga_id),
            ("limit", str(limit)),
            ("offset", str(offset)),
            ("includes[]", "scanlation_group"),
            ("order[volume]", "desc"),
            ("order[chapter]", "desc"),
        ]
        if langs_filter:
            for lg in langs_filter:
                params.append(("translatedLanguage[]", lg))

        r = retryable_get(client, f"{api_base}/chapter", params=params)
        data = r.json()
        items = data.get("data", [])
        total = int(data.get("total", 0))

        all_items.extend(items)
        offset += limit
        if offset >= total:
            break

    return all_items
