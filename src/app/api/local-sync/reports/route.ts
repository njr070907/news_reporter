import { NextResponse } from "next/server";
import { findReportByPeriod, getTopicById, saveReport } from "@/lib/db";
import { isLocalSyncRequestAuthorized, requireLocalSyncSecret } from "@/lib/local-sync";
import type { LlmProvider } from "@/lib/llm";
import type { ReportSource } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    requireLocalSyncSecret();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "同步服务未配置" },
      { status: 500 },
    );
  }
  if (!isLocalSyncRequestAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = new URL(req.url).searchParams;
  const topicId = params.get("topicId");
  const date = params.get("date");
  const rangeDays = Number(params.get("rangeDays") ?? "1");
  if (!topicId || !validDate(date) || rangeDays !== 1) {
    return NextResponse.json({ error: "查询参数错误" }, { status: 400 });
  }

  const report = await findReportByPeriod(topicId, date, rangeDays);
  if (!report) return NextResponse.json({ error: "报告不存在" }, { status: 404 });
  return NextResponse.json({
    report: {
      id: report.id,
      topicId: report.topic_id,
      date: report.date,
      markdown: report.markdown,
    },
  });
}

interface UploadReportBody {
  topicId?: string;
  date?: string;
  rangeDays?: number;
  markdown?: string;
  sources?: ReportSource[];
  llmProvider?: LlmProvider;
  llmModel?: string;
  generationMs?: number;
}

function validDate(date: unknown): date is string {
  return typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function validSources(value: unknown): value is ReportSource[] {
  return (
    Array.isArray(value) &&
    value.length <= 40 &&
    value.every(
      (source) =>
        source &&
        typeof source.sid === "string" &&
        typeof source.title === "string" &&
        typeof source.url === "string" &&
        typeof source.publisher === "string",
    )
  );
}

export async function POST(req: Request): Promise<NextResponse> {
  let raw = "";
  try {
    requireLocalSyncSecret();
    raw = await req.text();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "同步服务未配置" },
      { status: 500 },
    );
  }
  if (!isLocalSyncRequestAuthorized(req, raw)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: UploadReportBody;
  try {
    body = JSON.parse(raw) as UploadReportBody;
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const generationMs =
    typeof body.generationMs === "number" ? body.generationMs : -1;
  if (
    !body.topicId ||
    !validDate(body.date) ||
    body.rangeDays !== 1 ||
    typeof body.markdown !== "string" ||
    body.markdown.trim().length < 80 ||
    body.markdown.length > 200_000 ||
    !validSources(body.sources) ||
    (body.llmProvider !== "local" && body.llmProvider !== "remote") ||
    typeof body.llmModel !== "string" ||
    body.llmModel.length > 200 ||
    !Number.isInteger(generationMs) ||
    generationMs < 0 ||
    generationMs > 3_600_000
  ) {
    return NextResponse.json({ error: "报告参数错误" }, { status: 400 });
  }

  const topic = await getTopicById(body.topicId);
  if (!topic) return NextResponse.json({ error: "主题不存在" }, { status: 404 });

  const saved = await saveReport({
    topicId: topic.id,
    date: body.date,
    markdown: body.markdown,
    sourcesJson: JSON.stringify(body.sources),
    rangeDays: body.rangeDays,
    llmProvider: body.llmProvider,
    llmModel: body.llmModel,
    generationMs,
  });
  return NextResponse.json({ ok: true, reportId: saved.id, date: saved.date });
}
