import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listReportsForUser } from "@/lib/db";
import ReportsClient from "./ReportsClient";

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const reports = await listReportsForUser(user.id);

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
        <ReportsClient reports={reports} />
      )}
    </div>
  );
}
