"use client";

import { useEffect, useState } from "react";

interface Schedule {
  enabled: boolean;
  time: string;
  runOnWindowsLogin: boolean;
  runOnAdminLogin: boolean;
  runNowAt: string | null;
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border border-border p-4 transition-colors hover:border-border-hover">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
      />
      <span>
        <span className="block text-[14px] font-medium text-text-primary">{label}</span>
        <span className="mt-1 block text-[12px] leading-relaxed text-text-secondary">{description}</span>
      </span>
    </label>
  );
}

export default function AdminClient({ email }: { email: string }) {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/admin/schedule", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as { schedule?: Schedule; error?: string };
        if (!response.ok || !data.schedule) throw new Error(data.error ?? "加载设置失败");
        setSchedule(data.schedule);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "加载设置失败"))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    if (!schedule) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/admin/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schedule),
      });
      const data = (await response.json()) as { schedule?: Schedule; error?: string };
      if (!response.ok || !data.schedule) throw new Error(data.error ?? "保存失败");
      setSchedule(data.schedule);
      setMessage("设置已保存。本地代理会在下一次检查时生效。");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function runNow() {
    setRunning(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/admin/schedule", { method: "POST" });
      const data = (await response.json()) as { schedule?: Schedule; error?: string };
      if (!response.ok || !data.schedule) throw new Error(data.error ?? "请求失败");
      setSchedule(data.schedule);
      setMessage("已通知本地代理；它会补齐今天尚未上传的报告。");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "请求失败");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="page-enter mx-auto max-w-3xl px-6 py-12 md:py-16">
      <div>
        <p className="text-[13px] font-medium uppercase tracking-widest text-text-tertiary">Administrator</p>
        <h1 className="mt-2 text-[30px] font-semibold tracking-tight text-text-primary md:text-[36px]">
          Local delivery
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
          控制本机 Ollama 什么时候生成并上传所有用户的每日简报。
        </p>
        <p className="mt-2 text-[12px] text-text-tertiary">管理员账号：{email}</p>
      </div>

      <section className="card-surface mt-8 p-5 md:p-6">
        {loading ? (
          <div className="space-y-3">
            <div className="skeleton h-12 rounded-[var(--radius-md)]" />
            <div className="skeleton h-16 rounded-[var(--radius-md)]" />
            <div className="skeleton h-16 rounded-[var(--radius-md)]" />
          </div>
        ) : schedule ? (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-[16px] font-semibold text-text-primary">Delivery schedule</h2>
                <p className="mt-1 text-[13px] text-text-secondary">时间按北京时间（UTC+8）执行。</p>
              </div>
              <label className="flex items-center gap-3 text-[13px] font-medium text-text-primary">
                <span>启用自动配送</span>
                <input
                  type="checkbox"
                  checked={schedule.enabled}
                  onChange={(event) => setSchedule({ ...schedule, enabled: event.target.checked })}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
              </label>
            </div>

            <div className="mt-5 flex items-center gap-4 rounded-[var(--radius-md)] bg-[var(--accent-soft)]/50 p-4">
              <label htmlFor="delivery-time" className="text-[14px] font-medium text-text-primary">每日上传时间</label>
              <input
                id="delivery-time"
                type="time"
                value={schedule.time}
                onChange={(event) => setSchedule({ ...schedule, time: event.target.value })}
                className="rounded-[var(--radius-sm)] border border-border bg-[var(--surface-solid)] px-3 py-2 text-[15px] text-text-primary outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="mt-4 space-y-3">
              <Toggle
                checked={schedule.runOnWindowsLogin}
                onChange={(checked) => setSchedule({ ...schedule, runOnWindowsLogin: checked })}
                label="Windows 登录后立即检查并上传"
                description="本地代理随 Windows 登录启动；如果当天报告尚未完成，会立即开始生成。"
              />
              <Toggle
                checked={schedule.runOnAdminLogin}
                onChange={(checked) => setSchedule({ ...schedule, runOnAdminLogin: checked })}
                label="管理员登录网站后立即检查并上传"
                description="管理员登录网站会通知本地代理；电脑上的代理会在几分钟内开始处理。"
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={() => void save()} disabled={saving} className="btn-capsule btn-primary disabled:opacity-40">
                {saving ? "Saving..." : "保存设置"}
              </button>
              <button type="button" onClick={() => void runNow()} disabled={running} className="btn-capsule btn-secondary disabled:opacity-40">
                {running ? "Requesting..." : "立即上传缺失报告"}
              </button>
            </div>
          </>
        ) : null}

        {message && <p className="mt-4 text-[13px] text-[var(--success)]">{message}</p>}
        {error && <p className="mt-4 text-[13px] text-[var(--danger)]">{error}</p>}
      </section>

      <section className="mt-5 rounded-[var(--radius-lg)] border border-border bg-[var(--surface-solid)] p-5">
        <h2 className="text-[15px] font-semibold text-text-primary">运行条件</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
          网站只保存设置和接收报告；模型仍在你的电脑上运行。请保持 Ollama、Node.js 项目目录可用，并让 Windows 任务计划中的本地代理处于运行状态。用户不会直接访问你的本地模型。
        </p>
      </section>
    </div>
  );
}
