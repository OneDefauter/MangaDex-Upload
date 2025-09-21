from app.src.database.db import open_db, ensure_schema, check_settings, list_jobs
from app.src.path import DB_PATH

conn = open_db(DB_PATH)
ensure_schema(conn)
check_settings(conn)
