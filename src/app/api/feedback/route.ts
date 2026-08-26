import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getReportForUser, insertFeedback } from "@/lib/db";

const ALLOWED_KINDS = new Set([
  "section_thumb_up",
  "section_thumb_down",
  "daily_rating",
  "source_click",
]);

export async function POST(req: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    reportId?: string;
    kind?: string;
    target?: string;
    value?: string;
  };
  const { reportId, kind, target } = body;
  const value = body.value ?? "";
  if (
    !reportId ||
    !kind ||
    !ALLOWED_KINDS.has(kind) ||
    value.length > 500 ||
    (target ?? "").length > 1000
  ) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const report = await getReportForUser(reportId, user.id);
  if (!report) return NextResponse.json({ error: "报告不存在" }, { status: 404 });

  await insertFeedback({
    userId: user.id,
    reportId,
    kind,
    target,
    value,
  });
  return NextResponse.json({ ok: true });
}
