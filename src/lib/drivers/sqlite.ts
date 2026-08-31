import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { SCHEMA_SQL } from "../schema";

const g = globalThis as unknown as { __nrSqlite?: DatabaseSync };

type SqlParam = null | number | bigint | string | Uint8Array;

function getClient(): DatabaseSync {
  if (!g.__nrSqlite) {
    const dir = path.join(process.cwd(), "data");
    mkdirSync(dir, { recursive: true });
    const db = new DatabaseSync(path.join(dir, "app.db"));
    db.exec("PRAGMA journal_mode = WAL;");
    g.__nrSqlite = db;
  }
  return g.__nrSqlite;
}

function columnExists(table: string, column: string): boolean {
  const rows = getClient()
    .prepare(`PRAGMA table_info(${table})`)
    .all() as unknown as Array<{ name: string }>;
  return rows.some((r) => r.name === column);
}

function migrate(): void {
  const db = getClient();
  if (!columnExists("users", "password_hash")) {
    db.exec("ALTER TABLE users ADD COLUMN password_hash TEXT");
  }
  if (!columnExists("reports", "range_days")) {
    db.exec(`
      CREATE TABLE reports_migrated(
        id TEXT PRIMARY KEY,
        topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        markdown TEXT NOT NULL,
        sources_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        range_days INTEGER NOT NULL DEFAULT 1,
        llm_provider TEXT NOT NULL DEFAULT 'remote',
        llm_model TEXT NOT NULL DEFAULT '',
        generation_ms INTEGER
      );
      INSERT INTO reports_migrated(id, topic_id, date, markdown, sources_json, created_at, range_days)
        SELECT id, topic_id, date, markdown, sources_json, created_at, 1 FROM reports;
      DROP TABLE reports;
      ALTER TABLE reports_migrated RENAME TO reports;
    `);
  }
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS ux_reports_topic_date_range ON reports(topic_id, date, range_days)",
  );
  if (!columnExists("reports", "llm_provider")) {
    db.exec("ALTER TABLE reports ADD COLUMN llm_provider TEXT NOT NULL DEFAULT 'remote'");
  }
  if (!columnExists("reports", "llm_model")) {
    db.exec("ALTER TABLE reports ADD COLUMN llm_model TEXT NOT NULL DEFAULT ''");
  }
  if (!columnExists("reports", "generation_ms")) {
    db.exec("ALTER TABLE reports ADD COLUMN generation_ms INTEGER");
  }
}

export const sqliteDriver = {
  async init(): Promise<void> {
    getClient().exec(SCHEMA_SQL);
    migrate();
  },
  async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return getClient()
      .prepare(sql)
      .all(...(params as unknown as SqlParam[])) as unknown as T[];
  },
  async get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    return getClient()
      .prepare(sql)
      .get(...(params as unknown as SqlParam[])) as unknown as T | undefined;
  },
  async run(sql: string, params: unknown[] = []): Promise<void> {
    getClient().prepare(sql).run(...(params as unknown as SqlParam[]));
  },
};
