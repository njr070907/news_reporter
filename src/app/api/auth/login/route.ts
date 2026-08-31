import { NextResponse } from "next/server";
import {
  createUser,
  getUserByEmail,
  insertTopic,
  setPassword,
} from "@/lib/db";
import { isAdminUser, setSessionCookie } from "@/lib/auth";
import { markAdminLogin } from "@/lib/local-schedule";
import { PRESET_TOPICS } from "@/lib/presets";
import { hashPassword, verifyPassword } from "@/lib/password";

export async function POST(req: Request): Promise<NextResponse> {
  let email = "";
  let password = "";
  let mode = "login";
  try {
    const body = (await req.json()) as {
      email?: string;
      password?: string;
      mode?: string;
    };
    email = (body.email ?? "").trim().toLowerCase();
    password = body.password ?? "";
    if (body.mode === "register") mode = "register";
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "请输入有效的邮箱地址" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
  }

  const existing = await getUserByEmail(email);

  if (mode === "register") {
    if (existing && existing.password_hash) {
      return NextResponse.json(
        { error: "该邮箱已注册，请直接登录" },
        { status: 409 },
      );
    }
    const hash = hashPassword(password);
    let user = existing;
    if (!user) {
      user = await createUser(email, hash);
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
    } else {
      await setPassword(user.id, hash);
    }
    await setSessionCookie(user.id);
    if (await isAdminUser(user)) await markAdminLogin();
    return NextResponse.json({ ok: true });
  }

  if (!existing || !existing.password_hash) {
    return NextResponse.json(
      { error: "账号不存在或未设置密码，请先注册" },
      { status: 401 },
    );
  }
  if (!verifyPassword(password, existing.password_hash)) {
    return NextResponse.json({ error: "密码错误" }, { status: 401 });
  }
  await setSessionCookie(existing.id);
  if (await isAdminUser(existing)) await markAdminLogin();
  return NextResponse.json({ ok: true });
}
