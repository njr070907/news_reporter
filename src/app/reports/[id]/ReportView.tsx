"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ReportSource } from "@/lib/types";
import type { Section } from "./page";

interface Props {
  reportId: string;
  sources: ReportSource[];
  sections: Section[];
}

const NO_THUMB_TITLES = new Set(["", "今日要点", "本周要点", "信源清单"]);

async function sendFeedback(
  reportId: string,
  kind: string,
  value: string,
  target?: string,
): Promise<void> {
  try {
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, kind, value, target }),
    });
  } catch {}
}

function citedSids(body: string): string[] {
  const out: string[] = [];
  const re = /\[S(\d+)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) out.push(`S${m[1]}`);
  return out;
}

export default function ReportView({ reportId, sources, sections }: Props) {
  const [dailyRating, setDailyRating] = useState<number | null>(null);
  const [rated, setRated] = useState<Record<string, boolean>>({});

  const bySid = useMemo(() => {
    const map: Record<string, ReportSource> = {};
    for (const s of sources) map[s.sid] = s;
    return map;
  }, [sources]);

  async function trackSourceClick(e: React.MouseEvent<HTMLDivElement>) {
    const anchor = (e.target as HTMLElement).closest("a");
    if (!anchor) return;
    const href = anchor.getAttribute("href");
    if (!href || !href.startsWith("http")) return;
    const text = (anchor.textContent ?? "").trim().slice(0, 200);
    void sendFeedback(reportId, "source_click", text, href);
  }

  return (
    <div className="mt-4 pb-12">
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-dashed border-black/15 px-4 py-2.5 text-sm dark:border-white/15">
        <span className="text-neutral-500">这份简报对你有用吗？</span>
        {dailyRating !== null ? (
          <span className="text-neutral-400">已收到反馈，感谢 🙏</span>
        ) : (
          <div className="flex gap-2">
            {[
              { v: "2", label: "👍 有用" },
              { v: "1", label: "🙂 一般" },
              { v: "0", label: "👎 没用" },
            ].map((o) => (
              <button
                key={o.v}
                onClick={() => {
                  setDailyRating(Number(o.v));
                  void sendFeedback(reportId, "daily_rating", o.v);
                }}
                className="rounded-full border border-black/10 px-2.5 py-0.5 text-xs transition-colors hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        className="report-body"
        onClick={trackSourceClick}
      >
        {sections.map((sec, idx) => {
          const showThumb = !NO_THUMB_TITLES.has(sec.title);
          const imageSrc = showThumb
            ? citedSids(sec.body)
                .map((sid) => bySid[sid])
                .find((s) => s?.imageUrl)?.imageUrl
            : undefined;
          return (
            <section key={idx}>
              {sec.title && (
                <div className="group flex items-start justify-between gap-3">
                  <h2>{sec.title}</h2>
                  {showThumb && (
                    <span className="mt-1 flex shrink-0 gap-1 opacity-40 transition-opacity group-hover:opacity-100">
                      <button
                        aria-label="这节有帮助"
                        onClick={() => {
                          setRated((r) => ({ ...r, [`u${idx}`]: true }));
                          void sendFeedback(
                            reportId,
                            "section_thumb_up",
                            sec.title,
                          );
                        }}
                        className={`rounded px-1 text-sm ${
                          rated[`u${idx}`]
                            ? "bg-emerald-100 dark:bg-emerald-900/40"
                            : "hover:bg-black/5 dark:hover:bg-white/10"
                        }`}
                      >
                        👍
                      </button>
                      <button
                        aria-label="这节有问题"
                        onClick={() => {
                          setRated((r) => ({ ...r, [`d${idx}`]: true }));
                          void sendFeedback(
                            reportId,
                            "section_thumb_down",
                            sec.title,
                          );
                        }}
                        className={`rounded px-1 text-sm ${
                          rated[`d${idx}`]
                            ? "bg-red-100 dark:bg-red-900/40"
                            : "hover:bg-black/5 dark:hover:bg-white/10"
                        }`}
                      >
                        👎
                      </button>
                    </span>
                  )}
                </div>
              )}
              {imageSrc && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={imageSrc} alt={`${sec.title} 配图`} loading="lazy" />
              )}
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {sec.body}
              </ReactMarkdown>
            </section>
          );
        })}
      </div>
    </div>
  );
}
