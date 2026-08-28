import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listReportsForUser } from "@/lib/db";

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const reports = await listReportsForUser(user.id);

  const byDate = new Map<string, typeof reports>();
  for (const r of reports) {
    const list = byDate.get(r.date) ?? [];
    list.push(r);
    byDate.set(r.date, list);
  }

  return (
    <div className="page-enter mx-auto max-w-4xl px-6 py-12 md:py-16">
      {/* Page header */}
      <div className="mb-10">
        <h1 className="text-[28px] font-semibold tracking-tight text-text-primary md:text-[32px]">
          Briefings
        </h1>
        <p className="mt-2 text-[15px] text-text-secondary">
          Your collected news briefings, organized by date.
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="py-20 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft)]">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <h3 className="text-[18px] font-semibold text-text-primary">No briefings yet</h3>
          <p className="mx-auto mt-2 max-w-sm text-[14px] text-text-secondary">
            Set up your topics and generate your first briefing.
          </p>
          <Link href="/topics" className="btn-capsule btn-primary mt-6 inline-flex">
            Set Up Topics
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {Array.from(byDate.entries()).map(([date, items], dateIdx) => (
            <section
              key={date}
              className="stagger-in"
              style={{ animationDelay: `${dateIdx * 60}ms` }}
            >
              {/* Date divider */}
              <div className="mb-4 flex items-center gap-4">
                <h2 className="text-[13px] font-medium uppercase tracking-wider text-text-tertiary">
                  {date}
                </h2>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Reports for this date */}
              <div className="space-y-2">
                {items.map((r, idx) => {
                  const sources = JSON.parse(r.sources_json) as unknown[];
                  const createdTime = new Date(
                    new Date(r.created_at).getTime() + 8 * 3600000
                  ).toLocaleTimeString("zh-CN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <Link
                      key={r.id}
                      href={`/reports/${r.id}`}
                      className="group block rounded-[var(--radius-lg)] border border-border bg-[var(--surface-solid)] px-5 py-4 transition-all duration-280 hover:border-border-hover hover:shadow-[var(--shadow-md)]"
                      style={{ animationDelay: `${(dateIdx * items.length + idx) * 40}ms` }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-[16px] font-semibold tracking-tight text-text-primary transition-colors group-hover:text-[var(--accent)]">
                              {r.topic_name}
                            </h3>
                            <span className="inline-flex shrink-0 items-center rounded-full bg-black/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-text-tertiary dark:bg-white/[0.05]">
                              {r.range_days > 1 ? `Weekly · ${r.range_days}d` : "Daily"}
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-3 text-[13px] text-text-secondary">
                            <span>{sources.length} sources</span>
                            <span className="text-text-tertiary">·</span>
                            <span>{createdTime} generated</span>
                          </div>
                        </div>
                        <div className="mt-1 shrink-0 text-text-tertiary transition-all duration-200 group-hover:translate-x-1 group-hover:text-[var(--accent)]">
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M7 5l5 5-5 5" />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
