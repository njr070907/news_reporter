import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "../src/lib/env";
import { collectArticles } from "../src/lib/collect";
import { enrichArticles } from "../src/lib/enrich";
import { generateReport } from "../src/lib/report";
import type { Topic } from "../src/lib/types";

loadEnvFile();

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const noEnrich = args.includes("--no-enrich");
const positional = args.filter((a) => !a.startsWith("--"));

if (positional.length === 0) {
  console.log("用法：npx tsx scripts/m1.ts [--dry-run] [--no-enrich] <关键词1> <关键词2> ...");
  console.log("示例：npx tsx scripts/m1.ts --dry-run 人工智能 AI");
  console.log("说明：含中文的关键词走中文源，纯英文关键词走英文源。");
  process.exit(1);
}

async function main(): Promise<void> {
  const topic: Topic = {
    name: positional.join(" / "),
    keywordsZh: positional.filter((k) => /[\u4e00-\u9fff]/.test(k)),
    keywordsEn: positional.filter((k) => !/[\u4e00-\u9fff]/.test(k)),
  };

  console.log(`主题：${topic.name}`);
  console.log(`中文关键词：${topic.keywordsZh.join("、") || "无"}`);
  console.log(`英文关键词：${topic.keywordsEn.join(", ") || "无"}`);
  console.log("\n[1/3] 采集中…");

  const { articles, errors } = await collectArticles(topic);

  if (errors.length > 0) {
    for (const e of errors) console.warn(`  ⚠ 源失败（已跳过）→ ${e}`);
  }
  if (articles.length === 0) {
    console.error("没有采集到任何文章，终止。");
    process.exit(2);
  }

  console.log(`共采集 ${articles.length} 条（去重后）`);
  for (const a of articles) {
    const t = a.publishedAt ? a.publishedAt.toISOString().slice(0, 16).replace("T", " ") : "--";
    console.log(`  [${a.id}] (${a.lang}) ${a.publisher} · ${t}  ${a.title}`);
  }

  if (!noEnrich) {
    console.log("\n[2/3] 解码链接并抓取正文…");
    const stats = await enrichArticles(articles);
    console.log(`  Google 跳转链解码成功 ${stats.decoded} 条`);
    console.log(
      `  正文获取成功 ${stats.ok}/${stats.total}，其余将退回 RSS 摘要片段`,
    );
  }

  if (dryRun) {
    console.log("\n--dry-run 结束，未调用 LLM。填好 .env.local 后去掉 --dry-run 可生成完整报告。");
    return;
  }

  console.log("\n[3/3] 调用 LLM 生成报告…");
  let report: string;
  try {
    report = await generateReport(topic, articles);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(3);
  }

  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const slug = topic.name.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 40);
  const outDir = resolve(process.cwd(), "reports");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, `${dateStr}_${slug}.md`);
  writeFileSync(outPath, report, "utf8");
  console.log(`\n✅ 报告已生成：${outPath}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
