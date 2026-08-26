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
    <p className="mt-1 text-xs text-neutral-400">
      关键词：{all.join("、")}
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
    if (!confirm(`删除主题「${topic.name}」？其历史简报将一并删除。`)) return;
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
      setError(data.error ?? "添加失败");
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
      setError(data.error ?? "添加失败");
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
        setError(data.error ?? "生成失败");
        return;
      }
      router.push(`/reports/${data.reportId}`);
    } catch {
      setError("网络错误，请重试");
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl font-semibold tracking-tight">我的主题</h1>
          <span className="text-xs text-neutral-400">
            开启后才会每日生成简报
          </span>
        </div>

        <ul className="mt-4 divide-y divide-black/5 dark:divide-white/10 rounded-xl border border-black/10 dark:border-white/10">
          {topics.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-3">
              <button
                role="switch"
                aria-checked={t.active}
                onClick={() => toggleActive(t)}
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                  t.active ? "bg-emerald-600" : "bg-neutral-300 dark:bg-neutral-700"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                    t.active ? "left-[1.15rem]" : "left-0.5"
                  }`}
                />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{t.name}</p>
                <Keywords zh={t.keywordsZh} en={t.keywordsEn} />
              </div>
              <div className="flex shrink-0 items-center gap-1 text-xs">
                <span className="mr-1 hidden text-neutral-400 sm:inline">生成</span>
                {[1, 7].map((d) => (
                  <button
                    key={d}
                    onClick={() => generate(t.id, d)}
                    disabled={generating !== null}
                    className="rounded-full border border-black/15 px-3 py-1 hover:bg-black/5 disabled:opacity-40 dark:border-white/20 dark:hover:bg-white/10"
                  >
                    {generating === `${t.id}-${d}`
                      ? d === 1
                        ? "生成中…"
                        : "生成中…"
                      : d === 1
                        ? "日报"
                        : "周报"}
                  </button>
                ))}
              </div>
              <button
                onClick={() => remove(t)}
                className="shrink-0 text-xs text-neutral-400 hover:text-red-500"
              >
                删除
              </button>
            </li>
          ))}
          {topics.length === 0 && (
            <li className="px-4 py-6 text-sm text-neutral-400">
              还没有主题，从下方推荐中挑选或自定义一个吧。
            </li>
          )}
        </ul>
        {generating !== null && (
          <p className="mt-2 text-xs text-neutral-400">
            正在采集全球信源并生成报告，完成后会自动跳转…
          </p>
        )}
      </section>

      {availablePresets.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-neutral-500">推荐主题</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {availablePresets.map((p) => (
              <button
                key={p.name}
                onClick={() => addPreset(p.name)}
                className="rounded-full border border-dashed border-black/20 px-3 py-1.5 text-sm text-neutral-600 hover:border-neutral-900 hover:text-neutral-900 dark:border-white/25 dark:text-neutral-400 dark:hover:border-neutral-100 dark:hover:text-neutral-100"
              >
                + {p.name}
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-medium text-neutral-500">自定义主题</h2>
        <form onSubmit={addCustom} className="mt-3 space-y-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="主题名称（可选，如：新能源汽车）"
            className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-white/20 dark:focus:border-neutral-100"
          />
          <input
            value={newKeywords}
            onChange={(e) => setNewKeywords(e.target.value)}
            required
            placeholder="关键词，逗号分隔（中文走中文源，英文走英文源）"
            className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-white/20 dark:focus:border-neutral-100"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            className="rounded-full bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
          >
            添加主题
          </button>
        </form>
      </section>
    </div>
  );
}
