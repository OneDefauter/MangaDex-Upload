from flask import request, g
from app.src.services.language import t, load_bundles, set_persisted_lang

def request_user_session(app):
    @app.context_processor
    def inject_user():
        if request.path == "/login":
            return {}
        
        user = g.get("user")
        if user:
            return dict(user=user)
    
    @app.context_processor
    def inject_lang():
        lang = getattr(g, "user_language", "en")
        try:
            set_persisted_lang(lang)
        except Exception:
            pass

        bundles = getattr(g, "i18n", load_bundles(lang, debug=app.debug, default="en"))

        def _t(key: str, namespace: str = "web", default: str | None = None) -> str:
            return t(lang, key, namespace=namespace, default_value=default, debug=app.debug, fallback_default="en")

        return {
            "_t": _t,
            "i18n_lang": lang,
            "i18n_web": bundles.get("web", {}),
            "i18n_script": bundles.get("script", {}),
            "i18n_app": bundles.get("app", {}),
        }