from flask import g, redirect, request
from app.src.database import conn
from app.src.database.db import get_single_account
from app.src.auth.mangadex import get_or_refresh_access_token, AuthError
from app.src.services.language import load_bundles

# públicos por prefixo (arquivos estáticos / well-known)
EXEMPT_PREFIXES = ("/static/", "/.well-known/")
# públicos por path exato (se tiver)
EXEMPT_PATHS = {"/favicon.ico", "/logout"}  # /login NÃO entra aqui

def register_middlewares(app):
    @app.before_request
    def check_authentication():
        path = (request.path or "/").rstrip("/") or "/"

        # deixa passar estáticos e públicos
        if path in EXEMPT_PATHS or path.startswith(EXEMPT_PREFIXES):
            return None

        account = get_single_account(conn)

        # 1) NÃO logado → só /login permitido
        if not account:
            if path != "/login":
                return redirect("/login")
            return None  # deixa a view /login rodar

        # 2) JÁ logado → /login proibido (manda pra home)
        if path == "/login":
            return redirect("/")

        # 3) JÁ logado em rota protegida → garante token e injeta contexto
        try:
            g.access_token = get_or_refresh_access_token(conn)
        except AuthError:
            # se não conseguir renovar/logar, manda para /login
            return redirect("/login")

        g.user = account
        return None

    @app.before_request
    def user_language():
        g.user_language = request.headers.get("Accept-Language", "en").split(',')[0].lower()
        g.i18n = load_bundles(g.user_language, debug=app.debug, default="en")

    @app.after_request
    def add_cache_headers(response):
        # Desabilita cache em rotas autenticadas (exceto estáticos/públicos)
        path = (request.path or "/").rstrip("/") or "/"
        if getattr(g, "user", None) and not (path in EXEMPT_PATHS or path.startswith(EXEMPT_PREFIXES)):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0, private"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        return response
