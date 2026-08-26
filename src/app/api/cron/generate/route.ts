import { NextResponse } from "next/server";
import {
  findReportByPeriod,
  listActiveTopicsAll,
  saveReport,
  type TopicRow,
} from "@/lib/db";
import { runPipeline, NoArticlesError } from "@/lib/pipeline";
import { todayLocal } from "@/lib/date";

export const maxDuration = 300;

const GROUP_CONCURRENCY = 2;

function signature(row: TopicRow): string {
  const zh = (JSON.parse(row.keywords_zh) as string[])
    .map((k) => k.toLowerCase())
    .sort()
    .join(",");
  const en = (JSON.parse(row.keywords_en) as string[])
    .map((k) => k.toLowerCase())
    .sort()
    .join(",");
  return `${zh}|${en}`;
}

export async function GET(req: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret) {
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "CRON_SECRET 未配置" }, { status: 500 });
  }

  const force = new URL(req.url).searchParams.get("force") === "1";
  const date = todayLocal();
  const rows = await listActiveTopicsAll();

  const groups = new Map<string, TopicRow[]>();
  for (const row of rows) {
    const sig = signature(row);
    const list = groups.get(sig) ?? [];
    list.push(row);
    groups.set(sig, list);
  }

  let generated = 0;
  let cached = 0;
  let failed = 0;
  const errors: string[] = [];
  const workloads = Array.from(groups.values());

  async function worker(): Promise<void> {
    while (workloads.length > 0) {
      const items = workloads.shift();
      if (!items) break;
      if (!force) {
        const existingReports = await Promise.all(
          items.map((i) => findReportByPeriod(i.id, date, 1)),
        );
        if (existingReports.every((r) => r !== undefined)) {
          cached++;
          continue;
        }
      }
      const first = items[0];
      try {
        const result = await runPipeline(
          {
            name: first.name,
            keywordsZh: JSON.parse(first.keywords_zh) as string[],
            keywordsEn: JSON.parse(first.keywords_en) as string[],
          },
          1,
        );
        const sourcesJson = JSON.stringify(result.sources);
        for (const item of items) {
          await saveReport({
            topicId: item.id,
            date,
            markdown: result.markdown,
            sourcesJson,
            rangeDays: 1,
          });
        }
        generated++;
      } catch (err) {
        failed++;
        const label = `${first.name}(x${items.length})`;
        const msg =
          err instanceof NoArticlesError
            ? err.message
            : err instanceof Error
              ? err.message
              : String(err);
        errors.push(`${label}: ${msg}`);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(GROUP_CONCURRENCY, workloads.length) }, () => worker()),
  );

  return NextResponse.json({
    ok: true,
    topics: rows.length,
    groups: groups.size,
    generated,
    cached,
    failed,
    errors,
  });
}
