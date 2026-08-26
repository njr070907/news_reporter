import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findReportByPeriod, getTopic, saveReport } from "@/lib/db";
import { runPipeline, NoArticlesError } from "@/lib/pipeline";
import { todayLocal } from "@/lib/date";

export const maxDuration = 300;

export async function POST(req: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    topicId?: string;
    force?: boolean;
    days?: number;
  };
  if (!body.topicId) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  const days = body.days === 7 || body.days === 14 ? body.days : 1;

  const row = await getTopic(body.topicId, user.id);
  if (!row) return NextResponse.json({ error: "主题不存在" }, { status: 404 });

  const date = todayLocal();
  const existing = await findReportByPeriod(row.id, date, days);
  if (existing && !body.force) {
    return NextResponse.json({ reportId: existing.id, cached: true });
  }

  try {
    const result = await runPipeline(
      {
        name: row.name,
        keywordsZh: JSON.parse(row.keywords_zh) as string[],
        keywordsEn: JSON.parse(row.keywords_en) as string[],
      },
      days,
    );
    const saved = await saveReport({
      topicId: row.id,
      date,
      markdown: result.markdown,
      sourcesJson: JSON.stringify(result.sources),
      rangeDays: days,
    });
    return NextResponse.json({ reportId: saved.id, cached: false });
  } catch (err) {
    if (err instanceof NoArticlesError) {
      return NextResponse.json(
        { error: "没有采集到相关文章，请稍后再试或调整关键词" },
        { status: 502 },
      );
    }
    const msg =
      err instanceof Error ? err.message : "生成失败，请检查 LLM 配置后重试";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
