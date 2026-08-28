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
        setError(data.error ?? "Operation failed");
        return;
      }
      router.replace("/topics");
      router.refresh();
    } catch {
      setError("Network error, please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Mode toggle */}
      <div className="flex rounded-[var(--radius-md)] bg-black/[0.03] p-1 dark:bg-white/[0.05]">
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`flex-1 rounded-[var(--radius-sm)] py-2 text-[13px] font-medium transition-all duration-200 ${
              mode === m
                ? "bg-[var(--surface-solid)] text-text-primary shadow-[var(--shadow-sm)]"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {m === "login" ? "Sign In" : "Create Account"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="input-apple"
          />
        </div>
        <div>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6 characters)"
            className="input-apple"
          />
        </div>

        {error && (
          <p className="text-[13px] text-[var(--danger)]">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !email || !password}
          className="btn-capsule btn-primary w-full disabled:opacity-40"
        >
          {loading ? "Processing..." : mode === "login" ? "Continue" : "Create Account"}
        </button>
      </form>

      {mode === "register" && (
        <p className="mt-6 text-center text-[12px] leading-relaxed text-text-tertiary">
          Existing users: use &ldquo;Create Account&rdquo; with your email to set a password and access your briefing history.
        </p>
      )}
    </div>
  );
}
