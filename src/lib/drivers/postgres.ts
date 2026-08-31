import postgres from "postgres";
import { SCHEMA_SQL } from "../schema";

interface PgClient {
  unsafe(query: string, params?: unknown[]): Promise<unknown[]>;
}

const g = globalThis as unknown as { __nrPg?: PgClient };

function toPgQuery(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function getClient(): PgClient {
  if (!g.__nrPg) {
    const url =
      process.env.POSTGRES_URL ??
      process.env.DATABASE_URL ??
      process.env.POSTGRES_PRISMA_URL;
    if (!url) throw new Error("缺少 POSTGRES_URL / DATABASE_URL 环境变量");
    g.__nrPg = postgres(url, { prepare: false }) as unknown as PgClient;
  }
  return g.__nrPg;
}

async function migrate(sql: PgClient): Promise<void> {
  await sql.unsafe("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT");
  await sql.unsafe(
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS range_days INTEGER NOT NULL DEFAULT 1",
  );
  await sql.unsafe(
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS llm_provider TEXT NOT NULL DEFAULT 'remote'",
  );
  await sql.unsafe(
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS llm_model TEXT NOT NULL DEFAULT ''",
  );
  await sql.unsafe(
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS generation_ms INTEGER",
  );
  await sql.unsafe(
    "ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_topic_id_date_key",
  );
  await sql.unsafe("ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_range_unique");
  await sql.unsafe(
    "ALTER TABLE reports ADD CONSTRAINT reports_range_unique UNIQUE(topic_id, date, range_days)",
  );
}

export const postgresDriver = {
  async init(): Promise<void> {
    const sql = getClient();
    await sql.unsafe(SCHEMA_SQL);
    await migrate(sql);
  },
  async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return (await getClient().unsafe(toPgQuery(sql), params)) as T[];
  },
  async get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    const rows = await getClient().unsafe(toPgQuery(sql), params);
    return rows[0] as T | undefined;
  },
  async run(sql: string, params: unknown[] = []): Promise<void> {
    await getClient().unsafe(toPgQuery(sql), params);
  },
};
