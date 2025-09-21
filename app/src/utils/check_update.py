import requests
from requests.exceptions import ConnectionError, Timeout
from packaging import version
from __version__ import VERSION as __version__

from app.src.services.language import t, get_effective_lang

GITHUB_API = "https://api.github.com/repos/OneDefauter/MangaDex-Upload/releases/latest"
local_version = version.parse(__version__)


def check_update():
    """
    Retorna:
      {
        "update_available": bool,
        "local": "1.2.0",
        "remote": "1.3.0" ou None,
        "error": "mensagem" ou None
      }
    """
    lang = get_effective_lang()

    try:
        r = requests.get(GITHUB_API, timeout=10)
        if not r.ok:
            return {
                "update_available": False,
                "local": str(local_version),
                "remote": None,
                "error": t(
                    lang,
                    "utils.update.fetch_failed",
                    namespace="app",
                    default_value=f"Error fetching remote version ({r.status_code})"
                )
            }

        release = r.json()
        tag = release.get("tag_name", "").lstrip("vV")  # remove prefixo v
        remote_version = version.parse(tag)

        update = remote_version > local_version
        return {
            "update_available": update,
            "local": str(local_version),
            "remote": str(remote_version),
            "error": None
        }

    except ConnectionError:
        return {
            "update_available": False,
            "local": str(local_version),
            "remote": None,
            "error": t(
                lang,
                "utils.update.connection_error",
                namespace="app",
                default_value="Connection error: unable to check for updates."
            )
        }
    except Timeout:
        return {
            "update_available": False,
            "local": str(local_version),
            "remote": None,
            "error": t(
                lang,
                "utils.update.timeout",
                namespace="app",
                default_value="Error: request timed out."
            )
        }
    except Exception as e:
        return {
            "update_available": False,
            "local": str(local_version),
            "remote": None,
            "error": t(
                lang,
                "utils.update.unexpected_error",
                namespace="app",
                default_value=f"Unexpected error: {e}"
            )
        }
