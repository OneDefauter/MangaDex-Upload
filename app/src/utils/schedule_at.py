from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

LOCAL_TZ = datetime.now().astimezone().tzinfo

def _to_utc_iso(dt: datetime) -> str:
    """Formata em ISO 8601 UTC com sufixo Z (ex.: 2025-09-22T17:30:00Z)."""
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")

def normalize_schedule_at(schedule_at_raw: str | None, lang: str):
    """
    Normaliza a data de agendamento:
    - parse ISO (com/sem fuso; sem fuso => America/Sao_Paulo)
    - aplica regras de passado e janela máxima (~2 semanas, clamp)
    Retorna: (schedule_at_utc_iso | None, meta(dict))
    """
    meta = {
        "input": schedule_at_raw,
        "parsed_local": None,
        "parsed_utc": None,
        "reason": None,       # 'invalid_format' | 'past_date' | 'clamped' | None
        "clamp_target_utc": None,
    }

    if not schedule_at_raw:
        return None, meta

    # tentar parse ISO 8601
    try:
        dt = datetime.fromisoformat(schedule_at_raw.strip())
    except ValueError:
        meta["reason"] = "invalid_format"
        return None, meta

    # se for naive (sem tzinfo), assumir America/Sao_Paulo
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=LOCAL_TZ)

    now_utc = datetime.now(timezone.utc)
    dt_utc  = dt.astimezone(timezone.utc)
    meta["parsed_local"] = dt.astimezone(LOCAL_TZ).strftime("%Y-%m-%dT%H:%M:%S")
    meta["parsed_utc"]   = _to_utc_iso(dt_utc)

    # regra: passado -> None
    if dt_utc < now_utc:
        meta["reason"] = "past_date"
        return None, meta

    # janela: até 2 semanas; clamp para 1w6d23h
    max_date   = now_utc + timedelta(weeks=2)
    clamp_date = now_utc + timedelta(weeks=1, days=6, hours=23)

    if dt_utc > max_date:
        meta["reason"] = "clamped"
        meta["clamp_target_utc"] = _to_utc_iso(clamp_date)
        return _to_utc_iso(clamp_date), meta

    # ok
    return _to_utc_iso(dt_utc), meta
