import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  deleteTopic,
  insertTopic,
  listTopics,
  setTopicActive,
} from "@/lib/db";

function splitKeywords(text: string): { zh: string[]; en: string[] } {
  const parts = text
    .split(/[,，、]/)
    .map((k) => k.trim())
    .filter(Boolean);
  const hasCjk = /[\u4e00-\u9fff]/;
  return {
    zh: parts.filter((k) => hasCjk.test(k)),
    en: parts.filter((k) => !hasCjk.test(k)),
  };
}

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  return NextResponse.json({ topics: await listTopics(user.id) });
}

export async function POST(req: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    keywords?: string;
  };
  const keywords = splitKeywords(body.keywords ?? "");
  if (keywords.zh.length === 0 && keywords.en.length === 0) {
    return NextResponse.json(
      { error: "请至少填写一个关键词（逗号分隔）" },
      { status: 400 },
    );
  }
  const existing = await listTopics(user.id);
  if (existing.length >= 20) {
    return NextResponse.json({ error: "主题数量已达上限" }, { status: 400 });
  }
  const name =
    (body.name ?? "").trim() ||
    [...keywords.zh, ...keywords.en].slice(0, 3).join(" / ");
  const row = await insertTopic({
    userId: user.id,
    name,
    keywordsZh: keywords.zh,
    keywordsEn: keywords.en,
    active: true,
  });
  return NextResponse.json({ topic: row });
}

export async function PATCH(req: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    active?: boolean;
  };
  if (!body.id || typeof body.active !== "boolean") {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  const ok = await setTopicActive(body.id, user.id, body.active);
  if (!ok) return NextResponse.json({ error: "主题不存在" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { id?: string };
  if (!body.id) return NextResponse.json({ error: "参数错误" }, { status: 400 });
  const ok = await deleteTopic(body.id, user.id);
  if (!ok) return NextResponse.json({ error: "主题不存在" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
