export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users(
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS topics(
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  keywords_zh TEXT NOT NULL DEFAULT '[]',
  keywords_en TEXT NOT NULL DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reports(
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  markdown TEXT NOT NULL,
  sources_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  UNIQUE(topic_id, date)
);
CREATE INDEX IF NOT EXISTS idx_topics_user ON topics(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_topic ON reports(topic_id, date DESC);
`;
