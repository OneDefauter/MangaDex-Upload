from __future__ import annotations
import time
import httpx

def retryable_get(cli: httpx.Client, url: str, *, params=None, tries=3, backoff=0.75):
    for k in range(tries):
        r = cli.get(url, params=params)
        if r.status_code in (429, 500, 502, 503, 504):
            if k == tries - 1:
                r.raise_for_status()
            time.sleep(backoff * (2 ** k))
            continue
        r.raise_for_status()
        return r

def fetch_all_chapters(client: httpx.Client, api_base: str, manga_id: str, *, langs_filter=None):
    """
    Busca TODOS os capítulos (limit=100, paginação).
    """
    all_items = []
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
