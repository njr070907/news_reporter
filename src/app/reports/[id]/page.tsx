import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getReportForUser } from "@/lib/db";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

  const sources = JSON.parse(report.sources_json) as unknown[];

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
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          {report.date} · {sources.length} 条信源 · 每条论断可点回原文核实
        </p>
      </header>

      <div className="report-body mt-4 pb-12">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {report.markdown}
        </ReactMarkdown>
      </div>
    </article>
  );
}
