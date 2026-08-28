import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listReportsForUser, listTopics } from "@/lib/db";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="page-enter">
        {/* Hero section for logged-out users */}
        <section className="relative overflow-hidden px-6 py-24 md:py-32">
          <div className="pointer-events-none absolute right-0 top-0 h-[600px] w-[600px] translate-x-1/3 -translate-y-1/4 rounded-full bg-[var(--accent-glow)] opacity-10 blur-[120px]" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-[400px] w-[400px] -translate-x-1/4 translate-y-1/4 rounded-full bg-[var(--accent-glow)] opacity-8 blur-[100px]" />

          <div className="relative mx-auto max-w-3xl text-center">
            <p className="text-[13px] font-medium uppercase tracking-widest text-text-tertiary">
              Your Daily Intelligence
            </p>
            <h1 className="mt-6 text-[40px] font-semibold leading-[1.15] tracking-tight text-text-primary md:text-[56px]">
              What matters
              <br />
              <span className="text-text-secondary">in the world today?</span>
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-[17px] leading-relaxed text-text-secondary">
              Curated AI news briefings from trusted sources.
              Every claim verifiable. Every source cited.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/login" className="btn-capsule btn-primary px-8 py-3 text-[15px] pointer-glow">
                Get Started
              </Link>
              <Link href="/login" className="btn-capsule btn-secondary px-8 py-3 text-[15px]">
                Sign In
              </Link>
            </div>
          </div>
        </section>

        {/* Features section */}
        <section className="border-t border-border px-6 py-20">
          <div className="mx-auto max-w-4xl">
            <div className="grid gap-12 md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--accent-soft)] text-[var(--accent)]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </div>
                <h3 className="text-[15px] font-semibold text-text-primary">Multi-Source Collection</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
                  Google News, Bing News, and more. Aggregated and deduplicated automatically.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--accent-soft)] text-[var(--accent)]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <h3 className="text-[15px] font-semibold text-text-primary">AI-Powered Briefings</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
                  DeepSeek LLM generates concise, structured briefings with proper attribution.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--accent-soft)] text-[var(--accent)]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12l2 2 4-4" />
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-[15px] font-semibold text-text-primary">Verifiable Sources</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
                  Every claim links back to its original source. Click to verify.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // Logged-in user: show Today dashboard
  const reports = await listReportsForUser(user.id);
  const topics = await listTopics(user.id);
  const activeTopics = topics.filter((t) => t.active === 1);
  const latestReport = reports[0];

  return (
    <div className="page-enter">
      {/* Editorial Hero */}
      <section className="relative overflow-hidden px-6 pb-8 pt-12 md:pt-16">
        <div className="pointer-events-none absolute right-0 top-0 h-[500px] w-[500px] translate-x-1/3 -translate-y-1/3 rounded-full bg-[var(--accent-glow)] opacity-8 blur-[120px]" />

        <div className="relative mx-auto max-w-4xl">
          <p className="text-[13px] font-medium uppercase tracking-widest text-text-tertiary">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="mt-4 text-[32px] font-semibold leading-[1.15] tracking-tight text-text-primary md:text-[40px]">
            What matters today?
          </h1>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-text-secondary">
            {activeTopics.length > 0
              ? `Tracking ${activeTopics.length} active ${activeTopics.length === 1 ? "topic" : "topics"} across ${reports.length} briefings.`
              : "Set up your topics to start receiving daily briefings."}
          </p>
        </div>
      </section>

      {/* Quick actions */}
      <section className="px-6 pb-12 pt-4">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-wrap gap-3">
            <Link href="/topics" className="btn-capsule btn-primary pointer-glow">
              Generate Today&apos;s Brief
            </Link>
            <Link href="/reports" className="btn-capsule btn-secondary">
              View All Reports
            </Link>
          </div>
        </div>
      </section>

      {/* Bento grid */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Latest briefing - large card */}
            <div className="card-surface col-span-full p-6 md:col-span-2">
              <p className="text-[12px] font-medium uppercase tracking-wider text-text-tertiary">
                Latest Briefing
              </p>
              {latestReport ? (
                <Link href={`/reports/${latestReport.id}`} className="group mt-3 block">
                  <h3 className="text-[18px] font-semibold tracking-tight text-text-primary transition-colors group-hover:text-[var(--accent)]">
                    {latestReport.topic_name}
                  </h3>
                  <div className="mt-2 flex items-center gap-3 text-[13px] text-text-secondary">
                    <span>{latestReport.date}</span>
                    <span className="text-text-tertiary">·</span>
                    <span>{(JSON.parse(latestReport.sources_json) as unknown[]).length} sources</span>
                    <span className="text-text-tertiary">·</span>
                    <span>{latestReport.range_days > 1 ? `Weekly · ${latestReport.range_days}d` : "Daily"}</span>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-[13px] font-medium text-[var(--accent)] transition-all group-hover:gap-3">
                    Read Briefing
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 4l4 4-4 4" />
                    </svg>
                  </div>
                </Link>
              ) : (
                /* Skeleton preview when no reports */
                <div className="mt-4">
                  <div className="space-y-3">
                    <div className="skeleton h-5 w-3/4 rounded" />
                    <div className="skeleton h-4 w-1/2 rounded" />
                    <div className="mt-4 flex gap-2">
                      <div className="skeleton h-8 w-24 rounded-full" />
                      <div className="skeleton h-8 w-20 rounded-full" />
                    </div>
                  </div>
                  <p className="mt-4 text-[13px] text-text-tertiary">
                    Set up topics to generate your first briefing.
                  </p>
                </div>
              )}
            </div>

            {/* Active topics - sidebar */}
            <div className="card-surface p-6">
              <p className="text-[12px] font-medium uppercase tracking-wider text-text-tertiary">
                Active Topics
              </p>
              <div className="mt-4 space-y-3">
                {activeTopics.length > 0 ? (
                  activeTopics.slice(0, 4).map((t) => (
                    <div key={t.id} className="flex items-center gap-3">
                      <div className="h-2 w-2 flex-shrink-0 rounded-full bg-[var(--success)]" />
                      <span className="truncate text-[14px] text-text-primary">{t.name}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[14px] text-text-secondary">No active topics</p>
                )}
              </div>
              {activeTopics.length > 4 && (
                <p className="mt-3 text-[13px] text-text-tertiary">
                  +{activeTopics.length - 4} more
                </p>
              )}
              <Link href="/topics" className="mt-4 inline-flex items-center gap-2 text-[13px] font-medium text-[var(--accent)]">
                Manage Topics
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 4l4 4-4 4" />
                </svg>
              </Link>
            </div>

            {/* Stats card */}
            <div className="card-surface p-6 md:col-span-2">
              <p className="text-[12px] font-medium uppercase tracking-wider text-text-tertiary">
                Overview
              </p>
              <div className="mt-4 grid grid-cols-3 gap-6">
                <div>
                  <p className="text-[28px] font-semibold tracking-tight text-text-primary">{reports.length}</p>
                  <p className="mt-1 text-[13px] text-text-secondary">Total Briefings</p>
                </div>
                <div>
                  <p className="text-[28px] font-semibold tracking-tight text-text-primary">{topics.length}</p>
                  <p className="mt-1 text-[13px] text-text-secondary">Topics</p>
                </div>
                <div>
                  <p className="text-[28px] font-semibold tracking-tight text-text-primary">{activeTopics.length}</p>
                  <p className="mt-1 text-[13px] text-text-secondary">Active</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
