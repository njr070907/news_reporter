import { createHmac, timingSafeEqual } from "node:crypto";

const TIMESTAMP_HEADER = "x-local-sync-timestamp";
const SIGNATURE_HEADER = "x-local-sync-signature";
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

export function requireLocalSyncSecret(): string {
  const secret = process.env.LOCAL_SYNC_SECRET?.trim();
  if (!secret) throw new Error("缺少 LOCAL_SYNC_SECRET：请配置本地报告同步密钥");
  return secret;
}

function signature(timestamp: string, payload: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createLocalSyncHeaders(
  payload: string,
  secret = requireLocalSyncSecret(),
): Record<string, string> {
  const timestamp = String(Date.now());
  return {
    "Content-Type": "application/json; charset=utf-8",
    [TIMESTAMP_HEADER]: timestamp,
    [SIGNATURE_HEADER]: signature(timestamp, payload, secret),
  };
}

export function isLocalSyncRequestAuthorized(
  request: Request,
  payload = "",
): boolean {
  const secret = process.env.LOCAL_SYNC_SECRET?.trim();
  if (!secret) return false;

  const bearer = request.headers.get("authorization");
  if (payload === "" && bearer === `Bearer ${secret}`) return true;

  const timestamp = request.headers.get(TIMESTAMP_HEADER);
  const provided = request.headers.get(SIGNATURE_HEADER);
  if (!timestamp || !provided) return false;
  const time = Number(timestamp);
  if (!Number.isFinite(time) || Math.abs(Date.now() - time) > MAX_CLOCK_SKEW_MS) {
    return false;
  }
  return safeEqual(provided, signature(timestamp, payload, secret));
}
