import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getLlmProviderOptions } from "@/lib/llm";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  return NextResponse.json(getLlmProviderOptions());
}
