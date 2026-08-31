import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getFirstUser, getUserById, type UserRow } from "./db";

const COOKIE_NAME = "nr_session";

function getSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("缺少 AUTH_SECRET：请在 .env.local 中配置");
  return s;
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

export async function setSessionCookie(userId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, `${userId}.${sign(userId)}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<UserRow | null> {
  const raw = (await cookies()).get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const idx = raw.indexOf(".");
  if (idx <= 0) return null;
  const userId = raw.slice(0, idx);
  const sig = Buffer.from(raw.slice(idx + 1));
  const expected = Buffer.from(sign(userId));
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;
  return (await getUserById(userId)) ?? null;
}

export async function isAdminUser(user: UserRow): Promise<boolean> {
  const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (configuredEmail) return user.email.toLowerCase() === configuredEmail;
  const owner = await getFirstUser();
  return owner?.id === user.id;
}

export async function getCurrentAdmin(): Promise<UserRow | null> {
  const user = await getCurrentUser();
  return user && (await isAdminUser(user)) ? user : null;
}
