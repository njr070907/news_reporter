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
  englishSectionIndexes: number[];
  sectionTranslations: Record<number, Section>;
}

const NO_THUMB_TITLES = new Set([
  "",
  "今日要点",
  "本周要点",
  "信源清单",
  "Today's Highlights",
  "This Week's Highlights",
  "Today's Key Points",
  "This Week's Key Points",
  "Sources",
]);

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

export default function ReportView({
  reportId,
  sources,
  sections,
  englishSectionIndexes,
  sectionTranslations,
}: Props) {
  const [dailyRating, setDailyRating] = useState<number | null>(null);
  const [rated, setRated] = useState<Record<string, boolean>>({});
  const [sectionLanguage, setSectionLanguage] = useState<
    Record<number, "original" | "english">
  >({});

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
    <div className="pb-16">
      {/* Daily rating */}
      <div className="mb-10 rounded-[var(--radius-lg)] border border-border bg-[var(--surface-solid)] p-5">
        <p className="text-[14px] text-text-secondary">Was this briefing useful?</p>
        {dailyRating !== null ? (
          <p className="mt-2 text-[13px] text-text-tertiary">Thanks for your feedback.</p>
        ) : (
          <div className="mt-3 flex gap-2">
            {[
              { v: "2", label: "Useful", icon: "👍" },
              { v: "1", label: "Okay", icon: "🙂" },
              { v: "0", label: "Not useful", icon: "👎" },
            ].map((o) => (
              <button
                key={o.v}
                onClick={() => {
                  setDailyRating(Number(o.v));
                  void sendFeedback(reportId, "daily_rating", o.v);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-[13px] font-medium text-text-secondary transition-all duration-200 hover:border-border-hover hover:bg-black/[0.02] hover:text-text-primary dark:hover:bg-white/[0.03]"
              >
                <span>{o.icon}</span>
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Report body */}
      <div className="report-body" onClick={trackSourceClick}>
        {sections.map((sec, idx) => {
          const isEnglishArticle = englishSectionIndexes.includes(idx);
          const translatedSection = sectionTranslations[idx];
          const showingEnglish =
            sectionLanguage[idx] === "english" && Boolean(translatedSection);
          const displayedSection = showingEnglish ? translatedSection : sec;
          const showThumb = !NO_THUMB_TITLES.has(sec.title);
          const imageSrc = showThumb
            ? citedSids(displayedSection.body)
                .map((sid) => bySid[sid])
                .find((s) => s?.imageUrl)?.imageUrl
            : undefined;

          return (
            <section
              key={idx}
              className="stagger-in"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {sec.title && (
                <div className="group flex items-start justify-between gap-4">
                  <h2>{displayedSection.title}</h2>
                  {showThumb && (
                    <span className="mt-1.5 flex shrink-0 gap-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <button
                        aria-label="Helpful section"
                        onClick={() => {
                          setRated((r) => ({ ...r, [`u${idx}`]: true }));
                          void sendFeedback(
                            reportId,
                            "section_thumb_up",
                            sec.title,
                          );
                        }}
                        className={`rounded-md p-1.5 transition-colors ${
                          rated[`u${idx}`]
                            ? "bg-[var(--success)]/10 text-[var(--success)]"
                            : "text-text-tertiary hover:bg-black/[0.03] hover:text-text-primary dark:hover:bg-white/[0.05]"
                        }`}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill={rated[`u${idx}`] ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M7 10v12" />
                          <path d="M15 5.88L14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
                        </svg>
                      </button>
                      <button
                        aria-label="Unhelpful section"
                        onClick={() => {
                          setRated((r) => ({ ...r, [`d${idx}`]: true }));
                          void sendFeedback(
                            reportId,
                            "section_thumb_down",
                            sec.title,
                          );
                        }}
                        className={`rounded-md p-1.5 transition-colors ${
                          rated[`d${idx}`]
                            ? "bg-[var(--danger)]/10 text-[var(--danger)]"
                            : "text-text-tertiary hover:bg-black/[0.03] hover:text-text-primary dark:hover:bg-white/[0.05]"
                        }`}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill={rated[`d${idx}`] ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 14V2" />
                          <path d="M9 18.12L10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
                        </svg>
                      </button>
                    </span>
                  )}
                </div>
              )}
              {isEnglishArticle && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <div
                    className="inline-flex rounded-full border border-border bg-[var(--surface-solid)] p-1"
                    role="tablist"
                    aria-label={`${sec.title} language`}
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={!showingEnglish}
                      onClick={() =>
                        setSectionLanguage((languages) => ({
                          ...languages,
                          [idx]: "original",
                        }))
                      }
                      className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                        !showingEnglish
                          ? "bg-[var(--text-primary)] text-[var(--surface-solid)]"
                          : "text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      原文
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={showingEnglish}
                      disabled={!translatedSection}
                      onClick={() =>
                        setSectionLanguage((languages) => ({
                          ...languages,
                          [idx]: "english",
                        }))
                      }
                      className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                        showingEnglish
                          ? "bg-[var(--text-primary)] text-[var(--surface-solid)]"
                          : translatedSection
                            ? "text-text-secondary hover:text-text-primary"
                            : "cursor-not-allowed text-text-tertiary/60"
                      }`}
                    >
                      English
                    </button>
                  </div>
                  {!translatedSection && (
                    <span className="text-[12px] text-text-tertiary">
                      English version is being prepared locally.
                    </span>
                  )}
                </div>
              )}
              {imageSrc && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={imageSrc} alt={`${displayedSection.title} illustration`} loading="lazy" />
              )}
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {displayedSection.body}
              </ReactMarkdown>
            </section>
          );
        })}
      </div>

      {/* Source list */}
      {sources.length > 0 && (
        <div className="mt-12 border-t border-border pt-8">
          <h3 className="text-[14px] font-semibold tracking-tight text-text-primary">
            Sources ({sources.length})
          </h3>
          <div className="mt-4 space-y-2">
            {sources.map((s) => (
              <a
                key={s.sid}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between rounded-[var(--radius-md)] border border-border px-4 py-3 transition-all duration-200 hover:border-border-hover hover:shadow-[var(--shadow-sm)]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-text-primary transition-colors group-hover:text-[var(--accent)]">
                    {s.title}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-text-tertiary">
                    {s.publisher} {s.publishedAt ? `· ${s.publishedAt}` : ""}
                  </p>
                </div>
                <svg className="ml-4 shrink-0 text-text-tertiary transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7" />
                  <path d="M7 7h10v10" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
