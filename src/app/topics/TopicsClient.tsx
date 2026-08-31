"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PRESET_TOPICS } from "@/lib/presets";
import type { TopicItem } from "./page";
import { useToast } from "@/components/ToastProvider";

interface Props {
  initialTopics: TopicItem[];
}

type LlmProvider = "local" | "remote";

interface LlmOption {
  id: LlmProvider;
  label: string;
  model: string;
  available: boolean;
  description: string;
}

interface LlmOptionsResponse {
  activeProvider: LlmProvider;
  fallbackRemote: boolean;
  preGeneratedOnly: boolean;
  options: LlmOption[];
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
  const { toast } = useToast();
  const [topics, setTopics] = useState<TopicItem[]>(initialTopics);
  const [newKeywords, setNewKeywords] = useState("");
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [llmOptions, setLlmOptions] = useState<LlmOptionsResponse | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<LlmProvider | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/llm", { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as LlmOptionsResponse;
      })
      .then((data) => {
        if (!data) return;
        setLlmOptions(data);
        if (data.preGeneratedOnly) {
          setSelectedProvider(null);
        } else {
          const preferred = data.options.find(
            (option) => option.id === data.activeProvider && option.available,
          );
          const firstAvailable = data.options.find((option) => option.available);
          setSelectedProvider(preferred?.id ?? firstAvailable?.id ?? null);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const presetNames = useMemo(() => new Set(topics.map((t) => t.name)), [topics]);
  const availablePresets = PRESET_TOPICS.filter((p) => !presetNames.has(p.name));
  const activeTopics = topics.filter((t) => t.active);

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
    } else {
      toast(!topic.active ? "Topic activated" : "Topic deactivated");
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
    toast("Topic deleted");
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
    toast(`Added "${preset.name}"`);
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
    setComposerOpen(false);
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
    toast(`Created "${data.topic!.name}"`);
  }

  async function generate(topicId: string, days: number) {
    setGenerating(`${topicId}-${days}`);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId,
          days,
          ...(selectedProvider ? { llmProvider: selectedProvider } : {}),
        }),
      });
      const data = (await res.json()) as {
        reportId?: string;
        error?: string;
        code?: string;
      };
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
    <div className="space-y-10">
      {/* Page header */}
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-text-primary md:text-[32px]">
          My Interests
        </h1>
        <p className="mt-2 text-[15px] text-text-secondary">
          {topics.length} topics shaping your briefing.
        </p>
      </div>

      {/* LLM selection */}
      <section className="card-surface p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-text-primary">Briefing engine</h2>
            <p className="mt-1 text-[13px] text-text-secondary">
              {llmOptions?.preGeneratedOnly
                ? "Briefings are prepared once a day on the owner's local model."
                : "Choose where each new briefing is generated."}
            </p>
          </div>
          {selectedProvider && (
            <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[12px] font-medium text-[var(--accent)]">
              {llmOptions?.options.find((option) => option.id === selectedProvider)?.model}
            </span>
          )}
        </div>

        {llmOptions?.preGeneratedOnly ? (
          <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--accent-border)] bg-[var(--accent-soft)]/40 p-4">
            <p className="text-[14px] font-medium text-text-primary">Local daily delivery</p>
            <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">
              每日简报会提前生成并上传。点击 Daily 时直接打开已准备好的内容，不会让你的浏览器等待模型生成。
            </p>
          </div>
        ) : llmOptions ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2" role="radiogroup" aria-label="Briefing engine">
            {llmOptions.options.map((option) => {
              const selected = selectedProvider === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={!option.available}
                  onClick={() => setSelectedProvider(option.id)}
                  className={`rounded-[var(--radius-md)] border p-4 text-left transition-all ${
                    selected
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]/50"
                      : option.available
                        ? "border-border bg-[var(--surface-solid)] hover:border-border-hover"
                        : "cursor-not-allowed border-border bg-[var(--surface-solid)] opacity-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[14px] font-medium text-text-primary">{option.label}</span>
                    <span className={`h-2 w-2 rounded-full ${option.available ? "bg-[var(--success)]" : "bg-text-tertiary"}`} />
                  </div>
                  <p className="mt-1 text-[12px] text-text-tertiary">{option.model}</p>
                  <p className="mt-3 text-[12px] leading-relaxed text-text-secondary">
                    {option.available ? option.description : "当前环境未配置"}
                  </p>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="skeleton h-[116px] rounded-[var(--radius-md)]" />
            <div className="skeleton h-[116px] rounded-[var(--radius-md)]" />
          </div>
        )}

        {llmOptions?.fallbackRemote && selectedProvider === "local" && (
          <p className="mt-3 text-[12px] text-text-tertiary">
            本地模型失败或输出格式不完整且已显式启用云端 fallback 时，才会尝试云端。
          </p>
        )}
      </section>

      {/* Interest cloud */}
      {activeTopics.length > 0 && (
        <section>
          <h2 className="mb-3 text-[13px] font-medium uppercase tracking-wider text-text-tertiary">
            Active Interests
          </h2>
          <div className="flex flex-wrap gap-2">
            {activeTopics.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center rounded-full bg-[var(--accent-soft)] px-3.5 py-1.5 text-[13px] font-medium text-[var(--accent)]"
              >
                {t.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Topic list */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[13px] font-medium uppercase tracking-wider text-text-tertiary">
            All Topics
          </h2>
          <span className="text-[13px] text-text-tertiary">
            {activeTopics.length} active
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
                className={`group flex flex-wrap items-center gap-4 rounded-[var(--radius-lg)] border px-5 py-4 transition-all duration-280 ${
                  t.active
                    ? "border-[var(--accent-border)] bg-[var(--accent-soft)]/30"
                    : "border-border bg-[var(--surface-solid)] hover:border-border-hover"
                }`}
              >
                <button
                  role="switch"
                  aria-checked={t.active}
                  onClick={() => toggleActive(t)}
                  className={`toggle-switch ${t.active ? "data-[state=on]" : ""}`}
                  data-state={t.active ? "on" : "off"}
                />

                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium text-text-primary">{t.name}</p>
                  <Keywords zh={t.keywordsZh} en={t.keywordsEn} />
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => generate(t.id, 1)}
                    disabled={generating !== null}
                    className="btn-capsule btn-secondary px-3 py-1.5 text-[12px] disabled:opacity-40"
                  >
                    {generating === `${t.id}-1` ? "..." : "Daily"}
                  </button>
                  <button
                    onClick={() => generate(t.id, 7)}
                    disabled={generating !== null}
                    className="btn-capsule btn-secondary px-3 py-1.5 text-[12px] disabled:opacity-40"
                  >
                    {generating === `${t.id}-7` ? "..." : "Weekly"}
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
        {error && !composerOpen && (
          <p className="mt-3 text-[13px] text-[var(--danger)]">{error}</p>
        )}
      </section>

      {/* Preset suggestions */}
      {availablePresets.length > 0 && (
        <section>
          <h2 className="mb-3 text-[13px] font-medium uppercase tracking-wider text-text-tertiary">
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

      {/* Custom topic composer */}
      <section>
        {!composerOpen ? (
          <button
            onClick={() => setComposerOpen(true)}
            className="card-surface w-full px-5 py-4 text-left transition-all hover:shadow-[var(--shadow-md)]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <div>
                <p className="text-[14px] font-medium text-text-primary">Create a custom topic</p>
                <p className="text-[12px] text-text-tertiary">Define your own keywords for targeted briefings</p>
              </div>
            </div>
          </button>
        ) : (
          <div className="card-surface p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-medium text-text-primary">Custom Topic</h3>
              <button
                onClick={() => { setComposerOpen(false); setError(null); }}
                className="rounded-md p-1 text-text-tertiary hover:text-text-primary"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={addCustom} className="mt-4 space-y-3">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Topic name (optional)"
                className="input-apple"
              />
              <input
                value={newKeywords}
                onChange={(e) => setNewKeywords(e.target.value)}
                required
                placeholder="Keywords, comma-separated"
                className="input-apple"
                autoFocus
              />
              {error && <p className="text-[13px] text-[var(--danger)]">{error}</p>}
              <button
                type="submit"
                className="btn-capsule btn-primary text-[13px] disabled:opacity-40"
                disabled={!newKeywords}
              >
                Add Topic
              </button>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}
