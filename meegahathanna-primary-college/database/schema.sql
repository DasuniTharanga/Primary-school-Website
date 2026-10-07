PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL) STRICT;
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('ADMIN','EDITOR')),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf_token TEXT NOT NULL, expires_at INTEGER NOT NULL, last_seen INTEGER NOT NULL,
  created_at INTEGER NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS content (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('notices','events','teachers','classes','gallery','resources')),
  title TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '', status TEXT NOT NULL CHECK(status IN ('draft','published')),
  image_path TEXT NOT NULL DEFAULT '', data_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(data_json)),
  sort_order INTEGER NOT NULL DEFAULT 0, published_at TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1
) STRICT;
CREATE INDEX IF NOT EXISTS content_public ON content(kind, status, sort_order, published_at);
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK(id=1), data_json TEXT NOT NULL CHECK(json_valid(data_json)),
  version INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY, reference TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '', subject TEXT NOT NULL,
  message TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'NEW' CHECK(status IN ('NEW','READ','RESOLVED')),
  internal_notes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
) STRICT;
CREATE INDEX IF NOT EXISTS messages_status ON messages(status, created_at);
CREATE TABLE IF NOT EXISTS admissions (
  id TEXT PRIMARY KEY, reference TEXT NOT NULL UNIQUE,
  parent_name TEXT NOT NULL, parent_email TEXT NOT NULL, phone TEXT NOT NULL,
  child_name TEXT NOT NULL, date_of_birth TEXT NOT NULL, grade INTEGER NOT NULL CHECK(grade BETWEEN 1 AND 5),
  address TEXT NOT NULL, message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'NEW' CHECK(status IN ('NEW','CONTACTED','CLOSED')),
  internal_notes TEXT NOT NULL DEFAULT '', consent_at TEXT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1
) STRICT;
CREATE INDEX IF NOT EXISTS admissions_status ON admissions(status, created_at);
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY, public_path TEXT NOT NULL UNIQUE, storage_name TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL, mime_type TEXT NOT NULL, size INTEGER NOT NULL,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL, created_at TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  actor TEXT NOT NULL, action TEXT NOT NULL, subject TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS audit_created ON audit_log(created_at);
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL
) STRICT;
