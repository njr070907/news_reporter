import { getAppSetting, setAppSetting } from "./db";

const SCHEDULE_KEY = "local_delivery_schedule";
const ADMIN_LOGIN_KEY = "local_delivery_admin_login_at";

export interface LocalDeliverySchedule {
  enabled: boolean;
  time: string;
  runOnWindowsLogin: boolean;
  runOnAdminLogin: boolean;
  runNowAt: string | null;
}

export const DEFAULT_LOCAL_DELIVERY_SCHEDULE: LocalDeliverySchedule = {
  enabled: true,
  time: "06:00",
  runOnWindowsLogin: true,
  runOnAdminLogin: true,
  runNowAt: null,
};

function normalize(value: unknown): LocalDeliverySchedule {
  const input = value && typeof value === "object" ? (value as Partial<LocalDeliverySchedule>) : {};
  return {
    enabled: typeof input.enabled === "boolean" ? input.enabled : DEFAULT_LOCAL_DELIVERY_SCHEDULE.enabled,
    time: typeof input.time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)
      ? input.time
      : DEFAULT_LOCAL_DELIVERY_SCHEDULE.time,
    runOnWindowsLogin: typeof input.runOnWindowsLogin === "boolean"
      ? input.runOnWindowsLogin
      : DEFAULT_LOCAL_DELIVERY_SCHEDULE.runOnWindowsLogin,
    runOnAdminLogin: typeof input.runOnAdminLogin === "boolean"
      ? input.runOnAdminLogin
      : DEFAULT_LOCAL_DELIVERY_SCHEDULE.runOnAdminLogin,
    runNowAt: typeof input.runNowAt === "string" ? input.runNowAt : null,
  };
}

export async function getLocalDeliverySchedule(): Promise<LocalDeliverySchedule> {
  const raw = await getAppSetting(SCHEDULE_KEY);
  if (!raw) return { ...DEFAULT_LOCAL_DELIVERY_SCHEDULE };
  try {
    return normalize(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_LOCAL_DELIVERY_SCHEDULE };
  }
}

export async function saveLocalDeliverySchedule(
  input: Partial<LocalDeliverySchedule>,
): Promise<LocalDeliverySchedule> {
  const current = await getLocalDeliverySchedule();
  const next = normalize({ ...current, ...input });
  await setAppSetting(SCHEDULE_KEY, JSON.stringify(next));
  return next;
}

export async function requestLocalDeliveryNow(): Promise<LocalDeliverySchedule> {
  return saveLocalDeliverySchedule({ runNowAt: new Date().toISOString() });
}

export async function markAdminLogin(): Promise<void> {
  await setAppSetting(ADMIN_LOGIN_KEY, new Date().toISOString());
}

export async function getAdminLoginAt(): Promise<string | null> {
  return (await getAppSetting(ADMIN_LOGIN_KEY)) ?? null;
}
