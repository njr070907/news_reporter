"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, mode }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "操作失败");
        return;
      }
      router.replace("/topics");
      router.refresh();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-white/20 dark:focus:border-neutral-100";

  return (
    <div className="mt-6">
      <div className="flex rounded-lg border border-black/10 p-1 text-sm dark:border-white/15">
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`flex-1 rounded-md py-1.5 transition-colors ${
              mode === m
                ? "bg-neutral-900 font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
            }`}
          >
            {m === "login" ? "登录" : "注册"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-4 space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="邮箱"
          className={inputClass}
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密码（至少 6 位）"
          className={inputClass}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading || !email || !password}
          className="w-full rounded-lg bg-neutral-900 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {loading ? "处理中…" : mode === "login" ? "登录" : "创建账号"}
        </button>
      </form>

      {mode === "register" && (
        <p className="mt-4 text-xs leading-relaxed text-neutral-400">
          老用户（此前邮箱直登）：用原邮箱走「注册」设置一次密码，即可接管原有账号和简报历史。
        </p>
      )}
    </div>
  );
}
