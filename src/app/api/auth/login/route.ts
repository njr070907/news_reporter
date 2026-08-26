import { NextResponse } from "next/server";
import { createUser, getUserByEmail, insertTopic } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";
import { PRESET_TOPICS } from "@/lib/presets";

export async function POST(req: Request): Promise<NextResponse> {
  let email = "";
  try {
    const body = (await req.json()) as { email?: string };
    email = (body.email ?? "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "请输入有效的邮箱地址" }, { status: 400 });
  }

  const existing = await getUserByEmail(email);
  const user = existing ?? (await createUser(email));
  if (!existing) {
    for (let i = 0; i < PRESET_TOPICS.length; i++) {
      const p = PRESET_TOPICS[i];
      await insertTopic({
        userId: user.id,
        name: p.name,
        keywordsZh: p.keywordsZh,
        keywordsEn: p.keywordsEn,
        active: i < 2,
      });
    }
  }

  await setSessionCookie(user.id);
  return NextResponse.json({ ok: true });
}
