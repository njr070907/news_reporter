import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { SCHEMA_SQL } from "../schema";

const g = globalThis as unknown as { __nrSqlite?: DatabaseSync };

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

type SqlParam = null | number | bigint | string | Uint8Array;

export const sqliteDriver = {
  async init(): Promise<void> {
    getClient().exec(SCHEMA_SQL);
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
