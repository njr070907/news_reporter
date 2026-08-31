import { NextResponse } from "next/server";
import { listActiveTopicsAll } from "@/lib/db";
import { isLocalSyncRequestAuthorized, requireLocalSyncSecret } from "@/lib/local-sync";
import { todayLocal } from "@/lib/date";

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

  const topics = await listActiveTopicsAll();
  return NextResponse.json({
    date: todayLocal(),
    topics: topics.map((topic) => ({
      id: topic.id,
      name: topic.name,
      keywordsZh: JSON.parse(topic.keywords_zh) as string[],
      keywordsEn: JSON.parse(topic.keywords_en) as string[],
    })),
  });
}
