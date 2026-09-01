import { NextResponse } from "next/server";
import {
  getReportById,
  saveReportSectionTranslation,
} from "@/lib/db";
import { getEnglishSectionIndexes } from "@/lib/report-sections";
import { isLocalSyncRequestAuthorized, requireLocalSyncSecret } from "@/lib/local-sync";
import type { LlmProvider } from "@/lib/llm";
import type { ReportSource } from "@/lib/types";

export const runtime = "nodejs";

interface UploadSectionTranslationBody {
  reportId?: string;
  sectionIndex?: number;
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

  let body: UploadSectionTranslationBody;
  try {
    body = JSON.parse(raw) as UploadSectionTranslationBody;
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const generationMs =
    typeof body.generationMs === "number" ? body.generationMs : -1;
  const sectionIndex = body.sectionIndex;
  if (
    !body.reportId ||
    typeof sectionIndex !== "number" ||
    !Number.isInteger(sectionIndex) ||
    sectionIndex < 0 ||
    sectionIndex > 100 ||
    body.language !== "en" ||
    typeof body.markdown !== "string" ||
    body.markdown.trim().length < 80 ||
    body.markdown.length > 20_000 ||
    (body.llmProvider !== "local" && body.llmProvider !== "remote") ||
    typeof body.llmModel !== "string" ||
    body.llmModel.length > 200 ||
    !Number.isInteger(generationMs) ||
    generationMs < 0 ||
    generationMs > 3_600_000
  ) {
    return NextResponse.json({ error: "章节翻译参数错误" }, { status: 400 });
  }

  const report = await getReportById(body.reportId);
  if (!report) return NextResponse.json({ error: "报告不存在" }, { status: 404 });

  let sources: ReportSource[];
  try {
    sources = JSON.parse(report.sources_json) as ReportSource[];
  } catch {
    return NextResponse.json({ error: "报告信源格式错误" }, { status: 500 });
  }
  const englishSectionIndexes = getEnglishSectionIndexes(report.markdown, sources);
  if (!englishSectionIndexes.includes(sectionIndex)) {
    return NextResponse.json(
      { error: "该章节不是英文信源文章，不能上传英文翻译" },
      { status: 400 },
    );
  }

  const saved = await saveReportSectionTranslation({
    reportId: report.id,
    sectionIndex,
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
    sectionIndex: saved.section_index,
    language: saved.language,
  });
}
