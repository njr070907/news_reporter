"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PRESET_TOPICS } from "@/lib/presets";
import type { TopicItem } from "./page";

interface Props {
  initialTopics: TopicItem[];
}

function Keywords({ zh, en }: { zh: string[]; en: string[] }) {
  const all = [...zh, ...en];
  if (all.length === 0) return null;
  return (
    <p className="mt-1 text-[12px] text-text-tertiary">
      {all.join(" · ")}
    </p>
  );
}

export default function TopicsClient({ initialTopics }: Props) {
  const router = useRouter();
  const [topics, setTopics] = useState<TopicItem[]>(initialTopics);
  const [newKeywords, setNewKeywords] = useState("");
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);

  const presetNames = useMemo(() => new Set(topics.map((t) => t.name)), [topics]);
  const availablePresets = PRESET_TOPICS.filter((p) => !presetNames.has(p.name));

  async function toggleActive(topic: TopicItem) {
    setTopics((ts) =>
      ts.map((t) => (t.id === topic.id ? { ...t, active: !t.active } : t)),
    );
    const res = await fetch("/api/topics", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: topic.id, active: !topic.active }),
    });
    if (!res.ok) {
      setTopics((ts) =>
        ts.map((t) => (t.id === topic.id ? { ...t, active: topic.active } : t)),
      );
    }
  }

  async function remove(topic: TopicItem) {
    if (!confirm(`Delete topic "${topic.name}"? Its briefing history will also be removed.`)) return;
    setTopics((ts) => ts.filter((t) => t.id !== topic.id));
    await fetch("/api/topics", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: topic.id }),
    });
  }

  async function addPreset(presetName: string) {
    const preset = PRESET_TOPICS.find((p) => p.name === presetName);
    if (!preset) return;
    const res = await fetch("/api/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: preset.name,
        keywords: [...preset.keywordsZh, ...preset.keywordsEn].join(","),
      }),
    });
    const data = (await res.json()) as {
      topic?: {
        id: string;
        name: string;
        keywords_zh: string;
        keywords_en: string;
        active: number;
      };
      error?: string;
    };
    if (!res.ok || !data.topic) {
      setError(data.error ?? "Failed to add topic");
      return;
    }
    setError(null);
    setTopics((ts) => [
      ...ts,
      {
        id: data.topic!.id,
        name: data.topic!.name,
        keywordsZh: JSON.parse(data.topic!.keywords_zh) as string[],
        keywordsEn: JSON.parse(data.topic!.keywords_en) as string[],
        active: data.topic!.active === 1,
      },
    ]);
  }

  async function addCustom(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), keywords: newKeywords }),
    });
    const data = (await res.json()) as {
      topic?: {
        id: string;
        name: string;
        keywords_zh: string;
        keywords_en: string;
        active: number;
      };
      error?: string;
    };
    if (!res.ok || !data.topic) {
      setError(data.error ?? "Failed to add topic");
      return;
    }
    setError(null);
    setNewKeywords("");
    setNewName("");
    setTopics((ts) => [
      ...ts,
      {
        id: data.topic!.id,
        name: data.topic!.name,
        keywordsZh: JSON.parse(data.topic!.keywords_zh) as string[],
        keywordsEn: JSON.parse(data.topic!.keywords_en) as string[],
        active: data.topic!.active === 1,
      },
    ]);
  }

  async function generate(topicId: string, days: number) {
    setGenerating(`${topicId}-${days}`);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId, days }),
      });
      const data = (await res.json()) as { reportId?: string; error?: string };
      if (!res.ok || !data.reportId) {
        setError(data.error ?? "Generation failed");
        return;
      }
      router.push(`/reports/${data.reportId}`);
    } catch {
      setError("Network error, please try again");
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div className="space-y-12">
      {/* Page header */}
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-text-primary md:text-[32px]">
          My Topics
        </h1>
        <p className="mt-2 text-[15px] text-text-secondary">
          Toggle topics on to receive daily briefings.
        </p>
      </div>

      {/* Active topics */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[13px] font-medium uppercase tracking-wider text-text-tertiary">
            Your Topics
          </h2>
          <span className="text-[13px] text-text-tertiary">
            {topics.filter((t) => t.active).length} active
          </span>
        </div>

        {topics.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-border py-12 text-center">
            <p className="text-[14px] text-text-secondary">
              No topics yet. Choose from suggestions below or create a custom one.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {topics.map((t) => (
              <div
                key={t.id}
                className={`group flex items-center gap-4 rounded-[var(--radius-lg)] border px-5 py-4 transition-all duration-280 ${
                  t.active
                    ? "border-[var(--success)]/20 bg-[var(--success)]/[0.03]"
                    : "border-border bg-[var(--surface-solid)] hover:border-border-hover"
                }`}
              >
                {/* Toggle */}
                <button
                  role="switch"
                  aria-checked={t.active}
                  onClick={() => toggleActive(t)}
                  className={`toggle-switch ${t.active ? "data-[state=on]" : ""}`}
                  data-state={t.active ? "on" : "off"}
                />

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium text-text-primary">{t.name}</p>
                  <Keywords zh={t.keywordsZh} en={t.keywordsEn} />
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => generate(t.id, 1)}
                    disabled={generating !== null}
                    className="btn-capsule btn-secondary px-3 py-1.5 text-[12px] disabled:opacity-40"
                  >
                    {generating === `${t.id}-1` ? "Generating..." : "Daily"}
                  </button>
                  <button
                    onClick={() => generate(t.id, 7)}
                    disabled={generating !== null}
                    className="btn-capsule btn-secondary px-3 py-1.5 text-[12px] disabled:opacity-40"
                  >
                    {generating === `${t.id}-7` ? "Generating..." : "Weekly"}
                  </button>
                  <button
                    onClick={() => remove(t)}
                    className="rounded-md p-1.5 text-text-tertiary opacity-0 transition-all duration-200 hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] group-hover:opacity-100"
                    aria-label={`Delete ${t.name}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {generating !== null && (
          <div className="mt-4 flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--accent-soft)] px-4 py-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            <p className="text-[13px] text-[var(--accent)]">
              Collecting sources and generating briefing...
            </p>
          </div>
        )}
      </section>

      {/* Preset suggestions */}
      {availablePresets.length > 0 && (
        <section>
          <h2 className="mb-4 text-[13px] font-medium uppercase tracking-wider text-text-tertiary">
            Suggested Topics
          </h2>
          <div className="flex flex-wrap gap-2">
            {availablePresets.map((p) => (
              <button
                key={p.name}
                onClick={() => addPreset(p.name)}
                className="btn-capsule btn-secondary text-[13px]"
              >
                <span className="text-text-tertiary">+</span>
                {p.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Custom topic form */}
      <section className="rounded-[var(--radius-xl)] border border-border bg-[var(--surface-solid)] p-6">
        <h2 className="text-[15px] font-semibold text-text-primary">Custom Topic</h2>
        <form onSubmit={addCustom} className="mt-4 space-y-4">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Topic name (optional, e.g. Electric Vehicles)"
            className="input-apple"
          />
          <input
            value={newKeywords}
            onChange={(e) => setNewKeywords(e.target.value)}
            required
            placeholder="Keywords, comma-separated (Chinese keywords use Chinese sources, English use English sources)"
            className="input-apple"
          />
          {error && <p className="text-[13px] text-[var(--danger)]">{error}</p>}
          <button
            type="submit"
            className="btn-capsule btn-primary disabled:opacity-40"
            disabled={!newKeywords}
          >
            Add Topic
          </button>
        </form>
      </section>
    </div>
  );
}
