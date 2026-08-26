import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("data/app.db");
const users = db.prepare("SELECT id, email FROM users").all();
console.log(`用户数: ${users.length}`);
for (const u of users as Array<{ id: string; email: string }>) {
  const t = db.prepare("SELECT COUNT(*) AS c FROM topics WHERE user_id = ? AND active = 1").get(u.id) as { c: number };
  console.log(`  ${u.email} 活跃主题 ${t.c}`);
}
const reports = db
  .prepare(
    `SELECT r.id, r.date, length(r.markdown) AS len, t.name
     FROM reports r JOIN topics t ON t.id = r.topic_id ORDER BY r.created_at`,
  )
  .all();
console.log(`报告数: ${reports.length}`);
for (const r of reports as Array<{ name: string; date: string; len: number }>) {
  console.log(`  [${r.date}] ${r.name} — markdown ${r.len} 字符`);
}
