import { spawn } from "node:child_process";
import { loadEnvFile } from "../src/lib/env";

interface LocalSchedule {
  enabled: boolean;
  time: string;
  runOnWindowsLogin: boolean;
  runOnAdminLogin: boolean;
  runNowAt: string | null;
}

interface AgentConfig {
  date: string;
  time: string;
  schedule: LocalSchedule;
  adminLoginAt: string | null;
  missingTopicIds: string[];
  missingTranslationTopicIds: string[];
  pendingCount: number;
  shouldRun: boolean;
}

function baseUrl(): string {
  const value = process.env.LOCAL_SYNC_BASE_URL?.trim();
  if (!value) throw new Error("缺少 LOCAL_SYNC_BASE_URL：请配置网站地址");
  return value.replace(/\/+$/, "");
}

function secret(): string {
  const value = process.env.LOCAL_SYNC_SECRET?.trim();
  if (!value) throw new Error("缺少 LOCAL_SYNC_SECRET：请配置本地报告同步密钥");
  return value;
}

async function getConfig(event: "login" | "poll"): Promise<AgentConfig> {
  const response = await fetch(`${baseUrl()}/api/local-sync/config?event=${event}`, {
    headers: { Authorization: `Bearer ${secret()}` },
    signal: AbortSignal.timeout(30_000),
  });
  const raw = await response.text();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`网站返回了无法解析的代理配置（HTTP ${response.status}）`);
  }
  if (!response.ok) {
    throw new Error((data as { error?: string }).error ?? `代理配置请求失败（HTTP ${response.status}）`);
  }
  return data as AgentConfig;
}

function runDailyGenerator(): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ["node_modules/tsx/dist/cli.mjs", "scripts/local-daily.ts"],
      {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
        windowsHide: true,
      },
    );
    child.once("error", (error) => {
      console.error(`启动本地报告任务失败：${error.message}`);
      resolve(1);
    });
    child.once("exit", (code) => resolve(code ?? 1));
  });
}

let running = false;
let retryAfter = 0;
let lastAdminLoginAt: string | null = null;
let lastRunNowAt: string | null = null;

async function check(event: "login" | "poll"): Promise<void> {
  let config: AgentConfig;
  try {
    config = await getConfig(event);
  } catch (error) {
    console.error(`本地代理检查失败：${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  const newAdminLogin =
    config.schedule.enabled &&
    config.schedule.runOnAdminLogin &&
    Boolean(config.adminLoginAt) &&
    config.adminLoginAt !== lastAdminLoginAt;
  if (config.adminLoginAt) lastAdminLoginAt = config.adminLoginAt;

  const newManualRequest =
    config.schedule.enabled &&
    Boolean(config.schedule.runNowAt) &&
    config.schedule.runNowAt !== lastRunNowAt;
  if (config.schedule.runNowAt) lastRunNowAt = config.schedule.runNowAt;

  const shouldRun = config.shouldRun || newAdminLogin || newManualRequest;
  const pendingCount = config.pendingCount ?? new Set([
    ...config.missingTopicIds,
    ...(config.missingTranslationTopicIds ?? []),
  ]).size;
  if (!shouldRun || pendingCount === 0 || running || Date.now() < retryAfter) {
    return;
  }

  running = true;
  console.log(
    `本地代理开始上传：${config.date} · 待处理主题 ${pendingCount} · 触发 ${
      newAdminLogin ? "管理员登录" : newManualRequest ? "手动请求" : event === "login" ? "Windows 登录" : "定时"
    }`,
  );
  const exitCode = await runDailyGenerator();
  running = false;
  if (exitCode === 0) {
    retryAfter = 0;
    console.log("本地代理任务完成");
  } else {
    retryAfter = Date.now() + 15 * 60 * 1000;
    console.error("本地代理任务失败，15 分钟后重试");
  }
}

async function main(): Promise<void> {
  loadEnvFile();
  console.log("News Reporter 本地代理已启动，每 5 分钟检查一次配送设置");
  await check("login");
  setInterval(() => void check("poll"), 5 * 60 * 1000);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
