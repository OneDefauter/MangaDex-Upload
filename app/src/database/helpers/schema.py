SCHEMA_SQL = """
-- downloads
CREATE TABLE IF NOT EXISTS downloads (
  id                   TEXT PRIMARY KEY,
  ordem                INTEGER NOT NULL DEFAULT 0,
  projeto              TEXT,
  projeto_id           TEXT,
  idioma               TEXT,
  grupo                TEXT,
  titulo               TEXT,
  capitulo             TEXT,
  volume               TEXT,
  one_shot             INTEGER NOT NULL DEFAULT 0,
  path                 TEXT,
  hash                 TEXT,
  files                TEXT,
  progress_bp          INTEGER NOT NULL DEFAULT 0,
  priority             INTEGER NOT NULL DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'queued',
  retries              INTEGER NOT NULL DEFAULT 0,
  last_error           TEXT,
  worker_id            TEXT,
  claimed_at           TEXT,
  last_heartbeat       TEXT,
  lease_until          TEXT,
  attempts             INTEGER NOT NULL DEFAULT 0,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_downloads_status   ON downloads(status);
CREATE INDEX IF NOT EXISTS idx_downloads_ordem    ON downloads(ordem);
CREATE INDEX IF NOT EXISTS idx_downloads_priority ON downloads(priority);

-- uploads
CREATE TABLE IF NOT EXISTS uploads (
  id               TEXT PRIMARY KEY,
  ordem            INTEGER NOT NULL DEFAULT 0,

  projeto          TEXT,
  projeto_id       TEXT,
  idioma           TEXT,
  grupo            TEXT,

  titulo           TEXT,
  capitulo         TEXT,
  volume           TEXT,
  one_shot         INTEGER NOT NULL DEFAULT 0,
  long_strip       INTEGER NOT NULL DEFAULT 0,

  path             TEXT,
  path_temp        TEXT,
  schedule_at      TEXT,

  files_count      INTEGER NOT NULL DEFAULT 0,
  progress_bp      INTEGER NOT NULL DEFAULT 0,
  priority         INTEGER NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'queued',
  retries          INTEGER NOT NULL DEFAULT 0,
  last_error       TEXT,

  worker_id        TEXT,
  claimed_at       TEXT,
  last_heartbeat   TEXT,
  lease_until      TEXT,
  attempts         INTEGER NOT NULL DEFAULT 0,

  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_uploads_status     ON uploads(status);
CREATE INDEX IF NOT EXISTS idx_uploads_ordem      ON uploads(ordem);
CREATE INDEX IF NOT EXISTS idx_uploads_priority   ON uploads(priority);
CREATE INDEX IF NOT EXISTS idx_uploads_schedule   ON uploads(schedule_at);
CREATE INDEX IF NOT EXISTS idx_uploads_created_at ON uploads(created_at);

CREATE TRIGGER IF NOT EXISTS tr_uploads_touch_updated
AFTER UPDATE ON uploads
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE uploads SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- account
CREATE TABLE IF NOT EXISTS account (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  username      TEXT NOT NULL,
  password      TEXT NOT NULL,
  client_id     TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  access_token  TEXT,
  refresh_token TEXT,
  expires_at    INTEGER,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- settings
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'auto',
  scope      TEXT NOT NULL DEFAULT 'app',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- logs
CREATE TABLE IF NOT EXISTS upload_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  upload_id  TEXT,                          -- ref. uploads.id (UUID hex) ou NULL (global)
  ts         TEXT NOT NULL DEFAULT (datetime('now')),
  level      TEXT NOT NULL DEFAULT 'info',  -- debug|info|warning|error|critical
  stage      TEXT,                          -- queued|prepare|prefetch|upload|publish|done|...
  code       TEXT,                          -- opcional (ex.: MDX_401, NET_TIMEOUT)
  message    TEXT NOT NULL,
  data       TEXT,                          -- JSON com detalhes extras
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_uplogs_upload ON upload_logs(upload_id);
CREATE INDEX IF NOT EXISTS idx_uplogs_level  ON upload_logs(level);
CREATE INDEX IF NOT EXISTS idx_uplogs_ts     ON upload_logs(ts DESC);
"""
