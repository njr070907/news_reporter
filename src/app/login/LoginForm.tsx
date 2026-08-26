"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
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
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "登录失败");
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

  return (
    <form onSubmit={submit} className="mt-6 space-y-3">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-white/20 dark:focus:border-neutral-100"
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={loading || !email}
        className="w-full rounded-lg bg-neutral-900 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {loading ? "登录中…" : "进入"}
      </button>
    </form>
  );
}
