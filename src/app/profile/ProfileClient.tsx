"use client";

import { useState } from "react";
import Link from "next/link";
import AppearancePicker from "@/components/AppearancePicker";
const TABS = ["Overview", "Interests", "Appearance"] as const;
type Tab = (typeof TABS)[number];

export default function ProfileClient({ user, stats }: { user: { name: string; email: string }; stats: { briefings: number; storiesRead: number; saved: number; topics: number; likes: number } }) {
  const [tab, setTab] = useState<Tab>("Overview");

  return (
    <div className="page-enter mx-auto max-w-4xl px-6 py-12 md:py-16">
      {/* Hero */}
      <section className="relative mb-10 overflow-hidden">
        <div className="pointer-events-none absolute -right-20 -top-20 h-[300px] w-[300px] rounded-full bg-[var(--accent-glow)] opacity-15 blur-[80px]" />
        <div className="relative flex items-start gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)] text-[22px] font-semibold text-white shadow-[var(--shadow-md)]">
            {(user.name || user.email).slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="text-[13px] font-medium uppercase tracking-widest text-text-tertiary">
              Good morning
            </p>
            <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-text-primary md:text-[32px]">
              {user.name || user.email.split("@")[0]}
            </h1>
            <p className="mt-1 text-[15px] text-text-secondary">
              Your news, shaped around what matters to you.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Briefings", value: stats.briefings },
            { label: "Stories read", value: stats.storiesRead },
            { label: "Saved", value: stats.saved },
            { label: "Topics", value: stats.topics },
          ].map((s) => (
            <div key={s.label} className="card-surface px-4 py-3">
              <p className="text-[24px] font-semibold tracking-tight text-text-primary">
                {s.value || "—"}
              </p>
              <p className="mt-0.5 text-[12px] text-text-tertiary">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tabs */}
      <div className="mb-8 flex gap-1 rounded-full border border-border bg-[var(--surface-solid)] p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-full py-2 text-[13px] font-medium transition-all duration-200 ${
              tab === t
                ? "bg-[var(--accent)] text-white shadow-[var(--shadow-sm)]"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "Overview" && (
        <div className="space-y-6">
          <div className="card-surface p-6">
            <h3 className="text-[15px] font-semibold text-text-primary">Quick Actions</h3>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/topics" className="btn-capsule btn-primary text-[13px]">
                Generate Briefing
              </Link>
              <Link href="/reports" className="btn-capsule btn-secondary text-[13px]">
                View Reports
              </Link>
            </div>
          </div>
          <div className="card-surface p-6">
            <h3 className="text-[15px] font-semibold text-text-primary">About</h3>
            <p className="mt-2 text-[14px] text-text-secondary leading-relaxed">
              News Reporter is your personal AI news briefing service. Topics are curated from Google News and Bing News, then summarized by DeepSeek LLM. Every claim links back to its original source.
            </p>
          </div>
        </div>
      )}

      {tab === "Interests" && (
        <div className="card-surface p-6">
          <h3 className="text-[15px] font-semibold text-text-primary">My Interests</h3>
            <p className="mt-2 text-[14px] text-text-secondary">
              Manage your topics on the <Link href="/topics" className="text-[var(--accent)] hover:underline">Topics</Link> page.
            </p>
        </div>
      )}

      {tab === "Appearance" && (
        <div className="card-surface p-6">
          <AppearancePicker />
        </div>
      )}
    </div>
  );
}
