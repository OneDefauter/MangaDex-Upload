from flask import Blueprint, request, jsonify, render_template, redirect, flash, url_for, g
import requests, time

from app.src.database import conn
from app.src.database.db import upsert_single_account, get_setting
from app.src.services.language import t

login_bp = Blueprint('login', __name__)

def _flash_and_redirect(message: str, category: str = "info", endpoint: str = "login.login"):
    try:
        flash(message, category)
    except Exception:
        pass
    return redirect(url_for(endpoint))

@login_bp.route('/login')
def login():
    return render_template("login.html")

@login_bp.route("/login", methods=["POST"])
def login_post():
    lang = getattr(g, "user_language", "en")

    # 1) aceitar form OU JSON
    if request.is_json:
        payload_in = request.get_json(silent=True) or {}
        username      = (payload_in.get("username") or "").strip()
        password      = (payload_in.get("password") or "").strip()
        client_id     = (payload_in.get("client_id") or "").strip()
        client_secret = (payload_in.get("client_secret") or "").strip()
        wants_json = True
    else:
        username      = (request.form.get("user") or "").strip()
        password      = (request.form.get("password") or "").strip()
        client_id     = (request.form.get("id_client") or "").strip()
        client_secret = (request.form.get("secret_client") or "").strip()
        # heurística simples: se aceitar JSON, devolvemos JSON; senão, redirect
        wants_json = "application/json" in (request.headers.get("Accept") or "")

    if not all([username, password, client_id, client_secret]):
        msg = t(lang, "login.errors.missing_fields")
        return (jsonify({"error": msg}), 400) if wants_json else (_flash_and_redirect(msg, "danger"))

    token_url = get_setting(conn, "mangadex_token_url") or \
                "https://auth.mangadex.org/realms/mangadex/protocol/openid-connect/token"

    # 2) request para token
    try:
        r = requests.post(
            token_url,
            data={
                "grant_type": "password",
                "username": username,
                "password": password,
                "client_id": client_id,
                "client_secret": client_secret,
            },
            timeout=15,
        )
    except requests.RequestException as e:
        msg = t(lang, "login.errors.provider_connection").format(error=str(e))
        return (jsonify({"error": msg}), 502) if wants_json else (_flash_and_redirect(msg, "danger"))

    # 3) tratar erros (401/400, etc.)
    if r.status_code != 200:
        try:
            j = r.json()
            desc = j.get("error_description") or j.get("error") or r.text
        except Exception:
            desc = r.text or ""
        msg = t(lang, "login.errors.auth_failed").format(status=r.status_code, desc=desc)
        return (jsonify({"error": msg}), r.status_code) if wants_json else (_flash_and_redirect(msg, "danger"))

    # 4) sucesso: validar conteúdo
    try:
        j = r.json()
    except ValueError:
        msg = t(lang, "login.errors.invalid_json_response")
        return (jsonify({"error": msg}), 502) if wants_json else (_flash_and_redirect(msg, "danger"))

    access_token  = j.get("access_token")
    refresh_token = j.get("refresh_token")
    expires_in    = j.get("expires_in")  # ~900s
    if not access_token:
        msg = t(lang, "login.errors.missing_access_token")
        return (jsonify({"error": msg}), 502) if wants_json else (_flash_and_redirect(msg, "danger"))

    expires_at = int(time.time()) + int(expires_in or 900) - 60

    # 5) salvar/atualizar conta única
    upsert_single_account(
        conn,
        username=username,
        password=password,
        client_id=client_id,
        client_secret=client_secret,
        access_token=access_token,
        refresh_token=refresh_token,
        expires_at=expires_at,
    )

    # 6) resposta
    if wants_json:
        return jsonify({
            "message": t(lang, "login.api.success_message"),
            "expires_in": expires_in,
            "has_refresh_token": bool(refresh_token),
        }), 200
    else:
        flash(t(lang, "login.flash.success"), "success")
        return redirect(url_for("main.main"))  # ajuste o endpoint da sua home

@login_bp.route('/logout')
def logout():
    cur = conn.cursor()
    cur.execute("DELETE FROM account WHERE id=1;")
    return redirect("/login")
