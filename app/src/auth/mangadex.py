# app/src/auth/mangadex.py
import time
import requests
from app.src.database.db import upsert_single_account, get_single_account, get_setting

class AuthError(RuntimeError):
    pass

def _expires_at_from_expires_in(expires_in: int | None, skew: int = 60) -> int | None:
    if not expires_in:
        return None
    return int(time.time()) + int(expires_in) - skew

def _login_password(conn, acct, timeout=15) -> str:
    data = {
        "grant_type": "password",
        "username": acct["username"],
        "password": acct["password"],
        "client_id": acct["client_id"],
        "client_secret": acct["client_secret"],
    }
    
    TOKEN_URL = get_setting(conn, "mangadex_token_url") or "https://auth.mangadex.org/realms/mangadex/protocol/openid-connect/token"
    
    r = requests.post(TOKEN_URL, data=data, timeout=15)
    if r.status_code != 200:
        try:
            err = r.json().get("error_description") or r.text
        except Exception:
            err = r.text
        raise AuthError(f"password grant falhou ({r.status_code}): {err}")

    p = r.json()
    access_token  = p.get("access_token")
    refresh_token = p.get("refresh_token")
    if not access_token:
        raise AuthError("Resposta sem access_token no password grant")

    expires_at = _expires_at_from_expires_in(p.get("expires_in"))
    upsert_single_account(
        conn,
        username=acct["username"],
        password=acct["password"],
        client_id=acct["client_id"],
        client_secret=acct["client_secret"],
        access_token=access_token,
        refresh_token=refresh_token,
        expires_at=expires_at,
    )
    return access_token

def _refresh(conn, acct, timeout=15) -> str:
    if not acct.get("refresh_token"):
        raise AuthError("Sem refresh_token salvo")
    data = {
        "grant_type": "refresh_token",
        "refresh_token": acct["refresh_token"],
        "client_id": acct["client_id"],
        "client_secret": acct["client_secret"],
    }
    
    TOKEN_URL = get_setting(conn, "mangadex_token_url") or "https://auth.mangadex.org/realms/mangadex/protocol/openid-connect/token"
    
    r = requests.post(TOKEN_URL, data=data, timeout=timeout)
    if r.status_code != 200:
        try:
            err = r.json().get("error_description") or r.text
        except Exception:
            err = r.text
        raise AuthError(f"refresh grant falhou ({r.status_code}): {err}")

    p = r.json()
    access_token  = p.get("access_token")
    refresh_token = p.get("refresh_token") or acct["refresh_token"]
    if not access_token:
        raise AuthError("Resposta sem access_token no refresh grant")

    expires_at = _expires_at_from_expires_in(p.get("expires_in"))
    upsert_single_account(
        conn,
        username=acct["username"],
        password=acct["password"],
        client_id=acct["client_id"],
        client_secret=acct["client_secret"],
        access_token=access_token,
        refresh_token=refresh_token,
        expires_at=expires_at,
    )
    return access_token

def get_or_refresh_access_token(conn) -> str:
    """
    Garante um access_token válido para a conta única (id=1).
    - Se não tiver conta → AuthError
    - Se token válido → retorna
    - Se expirado/ausente → tenta refresh; se falhar, tenta password
    - Se tudo falhar → AuthError
    """
    acct = get_single_account(conn)
    if not acct:
        raise AuthError("Nenhuma conta cadastrada")

    token = acct.get("access_token")
    exp   = acct.get("expires_at")

    now = int(time.time())
    if token and exp and now < int(exp):
        return token  # ainda válido

    # tenta refresh primeiro
    try:
        return _refresh(conn, acct)
    except Exception:
        # fallback para password grant
        return _login_password(conn, acct)
