import { NextResponse } from "next/server";
import { getReportById, saveReportTranslation } from "@/lib/db";
import { isLocalSyncRequestAuthorized, requireLocalSyncSecret } from "@/lib/local-sync";
import type { LlmProvider } from "@/lib/llm";

export const runtime = "nodejs";

interface UploadTranslationBody {
  reportId?: string;
  language?: string;
  markdown?: string;
  llmProvider?: LlmProvider;
  llmModel?: string;
  generationMs?: number;
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

  let body: UploadTranslationBody;
  try {
    body = JSON.parse(raw) as UploadTranslationBody;
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const generationMs = typeof body.generationMs === "number" ? body.generationMs : -1;
  if (
    !body.reportId ||
    body.language !== "en" ||
    typeof body.markdown !== "string" ||
    body.markdown.trim().length < 80 ||
    body.markdown.length > 200_000 ||
    (body.llmProvider !== "local" && body.llmProvider !== "remote") ||
    typeof body.llmModel !== "string" ||
    body.llmModel.length > 200 ||
    !Number.isInteger(generationMs) ||
    generationMs < 0 ||
    generationMs > 3_600_000
  ) {
    return NextResponse.json({ error: "英文翻译参数错误" }, { status: 400 });
  }

  const report = await getReportById(body.reportId);
  if (!report) return NextResponse.json({ error: "报告不存在" }, { status: 404 });

  const saved = await saveReportTranslation({
    reportId: report.id,
    language: body.language,
    markdown: body.markdown,
    llmProvider: body.llmProvider,
    llmModel: body.llmModel,
    generationMs,
  });
  return NextResponse.json({
    ok: true,
    translationId: saved.id,
    reportId: saved.report_id,
    language: saved.language,
  });
}
