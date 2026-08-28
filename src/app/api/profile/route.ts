import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listTopics, listReportsForUser, countByKind } from "@/lib/db";

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const topics = await listTopics(user.id);
  const reports = await listReportsForUser(user.id);
  const likes = await countByKind(user.id, "section_thumb_up");
  const clicks = await countByKind(user.id, "source_click");

  return NextResponse.json({
    name: user.name,
    email: user.email,
    stats: {
      briefings: reports.length,
      storiesRead: clicks,
      saved: 0,
      topics: topics.length,
      likes,
    },
  });
}
