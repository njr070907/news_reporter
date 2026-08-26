import { sqliteDriver } from "./drivers/sqlite";
import { postgresDriver } from "./drivers/postgres";

export interface UserRow {
  id: string;
  email: string;
  name: string;
  created_at: string;
  password_hash?: string | null;
}

export interface TopicRow {
  id: string;
  user_id: string;
  name: string;
  keywords_zh: string;
  keywords_en: string;
  active: number;
  created_at: string;
}

export interface ReportRow {
  id: string;
  topic_id: string;
  date: string;
  markdown: string;
  sources_json: string;
  created_at: string;
  range_days: number;
}

interface DbDriver {
  init(): Promise<void>;
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T>(sql: string, params?: unknown[]): Promise<T | undefined>;
  run(sql: string, params?: unknown[]): Promise<void>;
}

const drivers: Record<string, DbDriver> = {
  sqlite: sqliteDriver,
  postgres: postgresDriver,
};

const g = globalThis as unknown as { __nrDriver?: Promise<DbDriver> };

function getDriver(): Promise<DbDriver> {
  if (!g.__nrDriver) {
    const isPg = Boolean(
      process.env.POSTGRES_URL ??
        process.env.DATABASE_URL ??
        process.env.POSTGRES_PRISMA_URL,
    );
    const name = isPg ? "postgres" : "sqlite";
    const driver = drivers[name];
    if (!driver) throw new Error(`未知数据库驱动: ${name}`);
    g.__nrDriver = (async () => {
      await driver.init();
      return driver;
    })();
  }
  return g.__nrDriver;
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function getUserByEmail(email: string): Promise<UserRow | undefined> {
  const db = await getDriver();
  return db.get<UserRow>("SELECT * FROM users WHERE email = ?", [email]);
}

export async function getUserById(id: string): Promise<UserRow | undefined> {
  const db = await getDriver();
  return db.get<UserRow>("SELECT * FROM users WHERE id = ?", [id]);
}

export async function createUser(email: string, passwordHash?: string): Promise<UserRow> {
  const user: UserRow = {
    id: crypto.randomUUID(),
    email,
    name: email.split("@")[0],
    created_at: nowIso(),
    password_hash: passwordHash ?? null,
  };
  const db = await getDriver();
  await db.run(
    "INSERT INTO users(id, email, name, created_at, password_hash) VALUES(?, ?, ?, ?, ?)",
    [user.id, user.email, user.name, user.created_at, user.password_hash],
  );
  return user;
}

export async function setPassword(userId: string, passwordHash: string): Promise<void> {
  const db = await getDriver();
  await db.run("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, userId]);
}

export async function listTopics(userId: string): Promise<TopicRow[]> {
  const db = await getDriver();
  return db.all<TopicRow>(
    "SELECT * FROM topics WHERE user_id = ? ORDER BY created_at ASC",
    [userId],
  );
}

export async function listActiveTopicsAll(): Promise<TopicRow[]> {
  const db = await getDriver();
  return db.all<TopicRow>("SELECT * FROM topics WHERE active = 1 ORDER BY created_at ASC");
}

export async function getTopic(
  topicId: string,
  userId: string,
): Promise<TopicRow | undefined> {
  const db = await getDriver();
  return db.get<TopicRow>("SELECT * FROM topics WHERE id = ? AND user_id = ?", [
    topicId,
    userId,
  ]);
}

export async function insertTopic(input: {
  userId: string;
  name: string;
  keywordsZh: string[];
  keywordsEn: string[];
  active?: boolean;
}): Promise<TopicRow> {
  const row: TopicRow = {
    id: crypto.randomUUID(),
    user_id: input.userId,
    name: input.name,
    keywords_zh: JSON.stringify(input.keywordsZh),
    keywords_en: JSON.stringify(input.keywordsEn),
    active: input.active ? 1 : 0,
    created_at: nowIso(),
  };
  const db = await getDriver();
  await db.run(
    "INSERT INTO topics(id, user_id, name, keywords_zh, keywords_en, active, created_at) VALUES(?,?,?,?,?,?,?)",
    [row.id, row.user_id, row.name, row.keywords_zh, row.keywords_en, row.active, row.created_at],
  );
  return row;
}

export async function setTopicActive(
  topicId: string,
  userId: string,
  active: boolean,
): Promise<boolean> {
  const db = await getDriver();
  const r = await db.get<{ count: number }>(
    "SELECT COUNT(*) AS count FROM topics WHERE id = ? AND user_id = ?",
    [topicId, userId],
  );
  if (!r || r.count === 0) return false;
  await db.run("UPDATE topics SET active = ? WHERE id = ? AND user_id = ?", [
    active ? 1 : 0,
    topicId,
    userId,
  ]);
  return true;
}

export async function deleteTopic(topicId: string, userId: string): Promise<boolean> {
  const db = await getDriver();
  const r = await db.get<{ count: number }>(
    "SELECT COUNT(*) AS count FROM topics WHERE id = ? AND user_id = ?",
    [topicId, userId],
  );
  if (!r || r.count === 0) return false;
  await db.run("DELETE FROM reports WHERE topic_id = ?", [topicId]);
  await db.run("DELETE FROM topics WHERE id = ? AND user_id = ?", [topicId, userId]);
  return true;
}

export async function findReportByPeriod(
  topicId: string,
  date: string,
  rangeDays: number,
): Promise<ReportRow | undefined> {
  const db = await getDriver();
  return db.get<ReportRow>(
    "SELECT * FROM reports WHERE topic_id = ? AND date = ? AND range_days = ?",
    [topicId, date, rangeDays],
  );
}

export async function saveReport(input: {
  topicId: string;
  date: string;
  markdown: string;
  sourcesJson: string;
  rangeDays: number;
}): Promise<ReportRow> {
  const existing = await findReportByPeriod(input.topicId, input.date, input.rangeDays);
  const db = await getDriver();
  if (existing) {
    await db.run(
      "UPDATE reports SET markdown = ?, sources_json = ?, created_at = ? WHERE id = ?",
      [input.markdown, input.sourcesJson, nowIso(), existing.id],
    );
    return { ...existing, markdown: input.markdown, sources_json: input.sourcesJson };
  }
  const row: ReportRow = {
    id: crypto.randomUUID(),
    topic_id: input.topicId,
    date: input.date,
    markdown: input.markdown,
    sources_json: input.sourcesJson,
    created_at: nowIso(),
    range_days: input.rangeDays,
  };
  await db.run(
    "INSERT INTO reports(id, topic_id, date, markdown, sources_json, created_at, range_days) VALUES(?,?,?,?,?,?,?)",
    [
      row.id,
      row.topic_id,
      row.date,
      row.markdown,
      row.sources_json,
      row.created_at,
      row.range_days,
    ],
  );
  return row;
}

export interface ReportListItem extends ReportRow {
  topic_name: string;
}

export async function listReportsForUser(userId: string): Promise<ReportListItem[]> {
  const db = await getDriver();
  return db.all<ReportListItem>(
    `SELECT r.*, t.name AS topic_name
     FROM reports r JOIN topics t ON t.id = r.topic_id
     WHERE t.user_id = ?
     ORDER BY r.date DESC, r.created_at DESC`,
    [userId],
  );
}

export async function getReportForUser(
  reportId: string,
  userId: string,
): Promise<(ReportRow & { topic_name: string }) | undefined> {
  const db = await getDriver();
  return db.get<ReportRow & { topic_name: string }>(
    `SELECT r.*, t.name AS topic_name
     FROM reports r JOIN topics t ON t.id = r.topic_id
     WHERE r.id = ? AND t.user_id = ?`,
    [reportId, userId],
  );
}

export interface FeedbackInput {
  userId: string;
  reportId: string;
  kind: string;
  target?: string;
  value: string;
}

export async function insertFeedback(input: FeedbackInput): Promise<void> {
  const db = await getDriver();
  await db.run(
    "INSERT INTO feedback(id, user_id, report_id, kind, target, value, created_at) VALUES(?,?,?,?,?,?,?)",
    [
      crypto.randomUUID(),
      input.userId,
      input.reportId,
      input.kind,
      input.target ?? null,
      input.value,
      nowIso(),
    ],
  );
}
