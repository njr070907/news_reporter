import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getReportForUser } from "@/lib/db";
import type { ReportSource } from "@/lib/types";
import ReportView from "./ReportView";

export interface Section {
  title: string;
  body: string;
}

function splitSections(markdown: string): Section[] {
  const lines = markdown.split(/\r?\n/);
  const sections: Section[] = [];
  let current: Section | null = null;
  const rest: string[] = [];
  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (current) sections.push(current);
      current = { title: line.slice(3).trim(), body: "" };
    } else if (current) {
      current.body += line + "\n";
    } else {
      rest.push(line);
    }
  }
  if (current) sections.push(current);
  if (rest.length > 0 && rest.join("").trim()) {
    sections.unshift({ title: "", body: rest.join("\n") });
  }
  return sections;
}

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const report = await getReportForUser(id, user.id);
  if (!report) notFound();

  const sources = JSON.parse(report.sources_json) as ReportSource[];
  const sections = splitSections(report.markdown);

  const createdTime = new Date(
    new Date(report.created_at).getTime() + 8 * 3600000
  ).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <article className="page-enter mx-auto max-w-[720px] px-6 py-12 md:py-16">
      {/* Back link */}
      <Link
        href="/reports"
        className="inline-flex items-center gap-2 text-[13px] text-text-tertiary transition-colors hover:text-text-primary"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 4l-4 4 4 4" />
        </svg>
        All Briefings
      </Link>

      {/* Report header */}
      <header className="mt-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[12px] font-medium text-[var(--accent)]">
            {report.range_days > 1 ? `Weekly · ${report.range_days} days` : "Daily"}
          </span>
        </div>
        <h1 className="mt-4 text-[32px] font-semibold leading-[1.15] tracking-tight text-text-primary md:text-[40px]">
          {report.topic_name}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-[13px] text-text-secondary">
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {report.date}
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 11a9 9 0 0 1 9 9" />
              <path d="M4 4a16 16 0 0 1 16 16" />
              <circle cx="5" cy="19" r="1" />
            </svg>
            {sources.length} sources
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {createdTime}
          </span>
        </div>
      </header>

      {/* Divider */}
      <div className="my-8 h-px bg-border" />

      {/* Report content */}
      <ReportView
        reportId={report.id}
        sources={sources}
        sections={sections}
      />
    </article>
  );
}
