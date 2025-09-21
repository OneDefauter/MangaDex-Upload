from __future__ import annotations

# conexão / schema
from app.src.database.helpers.conn import open_db, tx, ensure_schema

# settings
from app.src.database.helpers.settings import (
    set_setting, get_setting, get_all_settings,
    DEFAULT_SETTINGS, seed_defaults, check_settings,
)

# accounts
from app.src.database.helpers.accounts import (
    upsert_single_account, get_single_account,
)

# jobs core (comuns)
from app.src.database.helpers.jobs_core import (
    VALID_STATUSES,
    job_insert, job_update_progress,
    claim_next_job, fetch_job,
    mark_done, mark_error, heartbeat,
    recover_orphan_jobs,
)

# downloads
from app.src.database.helpers.downloads import (
    downloads_enqueue_bulk,
    downloads_set_manifest, downloads_get_manifest,
)

# uploads
from app.src.database.helpers.uploads import (
    uploads_enqueue_one, uploads_update_fields,
)

# consultas/listagens
from app.src.database.helpers.queries import (
    list_jobs, count_jobs, get_queue_snapshot,
)

# logs
from app.src.database.helpers.upload_logs import (
    add_upload_log, list_upload_logs, count_upload_logs, LEVELS
)