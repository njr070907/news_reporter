import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import {
  getLocalDeliverySchedule,
  requestLocalDeliveryNow,
  saveLocalDeliverySchedule,
} from "@/lib/local-schedule";

export const dynamic = "force-dynamic";

async function requireAdmin(): Promise<NextResponse | null> {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "无管理员权限" }, { status: 403 });
  return null;
}

export async function GET(): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied) return denied;
  return NextResponse.json({ schedule: await getLocalDeliverySchedule() });
}

export async function PUT(req: Request): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as {
    enabled?: boolean;
    time?: string;
    runOnWindowsLogin?: boolean;
    runOnAdminLogin?: boolean;
  };
  if (
    typeof body.enabled !== "boolean" ||
    typeof body.time !== "string" ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.time) ||
    typeof body.runOnWindowsLogin !== "boolean" ||
    typeof body.runOnAdminLogin !== "boolean"
  ) {
    return NextResponse.json({ error: "请提供有效的时间和开关设置" }, { status: 400 });
  }
  return NextResponse.json({
    schedule: await saveLocalDeliverySchedule(body),
  });
}

export async function POST(): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied) return denied;
  return NextResponse.json({ schedule: await requestLocalDeliveryNow() });
}
