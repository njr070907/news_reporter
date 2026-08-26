import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("data/app.db");
const rows = db
  .prepare(
    "SELECT date, range_days, length(markdown) AS len, markdown FROM reports ORDER BY created_at DESC LIMIT 5",
  )
  .all() as unknown as Array<{ date: string; range_days: number; len: number; markdown: string }>;

for (const r of rows) {
  const sections = (r.markdown.match(/^## /gm) ?? []).length;
  console.log(`[${r.date} r${r.range_days}] ${r.len} 字符 · ${sections} 个二级节`);
}
const latest = rows[0];
const heads = latest.markdown.split(/\r?\n/).filter((l) => l.startsWith("## "));
console.log("\n最新报告章节：");
heads.forEach((h) => console.log("  " + h));
