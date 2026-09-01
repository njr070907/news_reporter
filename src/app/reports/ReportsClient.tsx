"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ReportListItem } from "@/lib/db";

interface Props {
  reports: ReportListItem[];
}

function sourceCount(sourcesJson: string): number {
  try {
    const sources = JSON.parse(sourcesJson) as unknown;
    return Array.isArray(sources) ? sources.length : 0;
  } catch {
    return 0;
  }
}

function generatedTime(createdAt: string): string {
  return new Date(new Date(createdAt).getTime() + 8 * 3600000).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ReportsClient({ reports }: Props) {
  const dates = useMemo(
    () => Array.from(new Set(reports.map((report) => report.date))),
    [reports],
  );
  const [selectedDate, setSelectedDate] = useState(dates[0] ?? "");
  const selectedReports = reports.filter((report) => report.date === selectedDate);

  return (
    <div className="grid gap-8 md:grid-cols-[180px_minmax(0,1fr)] md:items-start md:gap-10">
      <aside className="md:sticky md:top-24">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[13px] font-medium uppercase tracking-wider text-text-tertiary">
            Browse by date
          </h2>
          <span className="text-[12px] text-text-tertiary">{dates.length}</span>
        </div>
        <nav
          aria-label="Briefing dates"
          className="flex gap-2 overflow-x-auto pb-1 md:block md:space-y-1 md:overflow-visible"
        >
          {dates.map((date, index) => {
            const count = reports.filter((report) => report.date === date).length;
            const selected = date === selectedDate;
            return (
              <button
                key={date}
                type="button"
                aria-current={selected ? "date" : undefined}
                onClick={() => setSelectedDate(date)}
                className={`flex shrink-0 items-center justify-between gap-3 rounded-[var(--radius-md)] border px-3.5 py-3 text-left transition-all md:w-full ${
                  selected
                    ? "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "border-transparent text-text-secondary hover:border-border hover:bg-[var(--surface-solid)] hover:text-text-primary"
                }`}
              >
                <span>
                  <span className="block text-[13px] font-medium">{date}</span>
                  {index === 0 && (
                    <span className="mt-0.5 block text-[11px] opacity-70">Latest</span>
                  )}
                </span>
                <span className="text-[12px] opacity-70">{count}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="min-w-0">
        <div className="mb-4 flex items-center gap-4">
          <h2 className="text-[13px] font-medium uppercase tracking-wider text-text-tertiary">
            {selectedDate}
          </h2>
          <div className="h-px flex-1 bg-border" />
          <span className="text-[12px] text-text-tertiary">
            {selectedReports.length} briefings
          </span>
        </div>

        <div className="space-y-2">
          {selectedReports.map((report, index) => {
            const engine = report.llm_model
              ? `${report.llm_provider === "local" ? "Local" : "Cloud"} · ${report.llm_model}`
              : null;
            return (
              <Link
                key={report.id}
                href={`/reports/${report.id}`}
                className="group block rounded-[var(--radius-lg)] border border-border bg-[var(--surface-solid)] px-5 py-4 transition-all duration-280 hover:border-border-hover hover:shadow-[var(--shadow-md)]"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-[16px] font-semibold tracking-tight text-text-primary transition-colors group-hover:text-[var(--accent)]">
                        {report.topic_name}
                      </h3>
                      <span className="inline-flex shrink-0 items-center rounded-full bg-black/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-text-tertiary dark:bg-white/[0.05]">
                        {report.range_days > 1 ? `Weekly · ${report.range_days}d` : "Daily"}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[13px] text-text-secondary">
                      <span>{sourceCount(report.sources_json)} sources</span>
                      <span className="text-text-tertiary">·</span>
                      <span>{generatedTime(report.created_at)} generated</span>
                      {engine && (
                        <>
                          <span className="text-text-tertiary">·</span>
                          <span>{engine}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 shrink-0 text-text-tertiary transition-all duration-200 group-hover:translate-x-1 group-hover:text-[var(--accent)]">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M7 5l5 5-5 5" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
