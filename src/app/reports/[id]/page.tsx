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

  return (
    <article className="mx-auto max-w-3xl">
      <header className="border-b border-black/10 pb-5 dark:border-white/10">
        <Link
          href="/reports"
          className="text-xs text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          ← 全部简报
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          {report.topic_name}
          <span className="ml-3 align-middle text-xs font-normal text-neutral-400">
            {report.range_days > 1 ? `周报 · 近${report.range_days}天` : "日报"}
          </span>
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          {report.date} · {sources.length} 条信源 · 每条论断可点回原文核实
        </p>
      </header>

      <ReportView
        reportId={report.id}
        sources={sources}
        sections={sections}
      />
    </article>
  );
}
