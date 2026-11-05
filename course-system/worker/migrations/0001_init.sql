CREATE TABLE IF NOT EXISTS course_access (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stripe_session_id TEXT NOT NULL UNIQUE,
  course_slug TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  email_sent_at TEXT,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_course_access_token_hash
  ON course_access(token_hash);

CREATE TABLE IF NOT EXISTS lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_lessons_course_order
  ON lessons(course_slug, sort_order);
