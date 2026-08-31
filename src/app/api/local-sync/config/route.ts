import { NextResponse } from "next/server";
import { getAdminLoginAt } from "@/lib/local-schedule";
import { getLocalDeliverySchedule } from "@/lib/local-schedule";
import { listMissingActiveTopicIds } from "@/lib/db";
import { todayLocal } from "@/lib/date";
import { isLocalSyncRequestAuthorized, requireLocalSyncSecret } from "@/lib/local-sync";

export const runtime = "nodejs";

function beijingTime(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

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

  const date = todayLocal();
  const [schedule, missingTopicIds, adminLoginAt] = await Promise.all([
    getLocalDeliverySchedule(),
    listMissingActiveTopicIds(date),
    getAdminLoginAt(),
  ]);
  const event = new URL(req.url).searchParams.get("event");
  const scheduledDue = schedule.enabled && beijingTime() >= schedule.time;
  const loginDue = schedule.enabled && event === "login" && schedule.runOnWindowsLogin;
  const manualDue = schedule.enabled && Boolean(schedule.runNowAt);

  return NextResponse.json({
    date,
    time: beijingTime(),
    schedule,
    adminLoginAt,
    missingTopicIds,
    shouldRun: missingTopicIds.length > 0 && (scheduledDue || loginDue || manualDue),
  });
}
