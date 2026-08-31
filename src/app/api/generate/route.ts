import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findReportByPeriod, getTopic, saveReport } from "@/lib/db";
import { runPipeline, NoArticlesError } from "@/lib/pipeline";
import { todayLocal } from "@/lib/date";
import { isLlmProviderConfigured, type LlmProvider } from "@/lib/llm";

export const maxDuration = 300;

export async function POST(req: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    topicId?: string;
    force?: boolean;
    days?: number;
    llmProvider?: LlmProvider;
  };
  if (!body.topicId) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  const days = body.days === 7 || body.days === 14 ? body.days : 1;
  if (
    body.llmProvider !== undefined &&
    body.llmProvider !== "local" &&
    body.llmProvider !== "remote"
  ) {
    return NextResponse.json({ error: "LLM 提供商参数错误" }, { status: 400 });
  }
  const row = await getTopic(body.topicId, user.id);
  if (!row) return NextResponse.json({ error: "主题不存在" }, { status: 404 });

  const date = todayLocal();
  const existing = await findReportByPeriod(row.id, date, days);
  if (existing && !body.force) {
    return NextResponse.json({ reportId: existing.id, cached: true });
  }

  if (process.env.REPORTS_PREGENERATED_ONLY === "true" && !body.force) {
    return NextResponse.json(
      {
        code: "REPORT_NOT_READY",
        error: days === 1
          ? "今日报告还未生成，请稍后再试"
          : "该周期报告还未生成，请稍后再试",
      },
      { status: 409 },
    );
  }

  if (body.llmProvider && !isLlmProviderConfigured(body.llmProvider)) {
    return NextResponse.json({ error: "所选 LLM 提供商未配置" }, { status: 400 });
  }

  try {
    const result = await runPipeline(
      {
        name: row.name,
        keywordsZh: JSON.parse(row.keywords_zh) as string[],
        keywordsEn: JSON.parse(row.keywords_en) as string[],
      },
      days,
      { provider: body.llmProvider },
    );
    const saved = await saveReport({
      topicId: row.id,
      date,
      markdown: result.markdown,
      sourcesJson: JSON.stringify(result.sources),
      rangeDays: days,
      llmProvider: result.generation.provider,
      llmModel: result.generation.model,
      generationMs: result.generation.generationMs,
    });
    return NextResponse.json({
      reportId: saved.id,
      cached: false,
      llm: result.generation,
    });
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
