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
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">简报</h1>
        <Link
          href="/topics"
          className="text-sm text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          管理主题 →
        </Link>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/15 px-6 py-16 text-center dark:border-white/15">
          <p className="text-sm text-neutral-500">
            还没有简报。去「主题」页开启主题并点击「生成今日简报」。
          </p>
        </div>
      ) : (
        Array.from(byDate.entries()).map(([date, items]) => (
          <section key={date}>
            <h2 className="text-sm font-medium text-neutral-400">{date}</h2>
            <ul className="mt-2 space-y-2">
              {items.map((r) => {
                const sources = JSON.parse(r.sources_json) as unknown[];
                return (
                  <li key={r.id}>
                    <Link
                      href={`/reports/${r.id}`}
                      className="block rounded-xl border border-black/10 px-4 py-3 transition-colors hover:bg-black/[0.03] dark:border-white/10 dark:hover:bg-white/[0.05]"
                    >
                      <p className="font-medium">
                        {r.topic_name}
                        <span className="ml-2 rounded-full bg-black/5 px-2 py-0.5 align-middle text-[11px] font-normal text-neutral-500 dark:bg-white/10 dark:text-neutral-400">
                          {r.range_days > 1 ? `周报 · 近${r.range_days}天` : "日报"}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-400">
                        {sources.length} 条信源 ·{" "}
                        {new Date(new Date(r.created_at).getTime() + 8 * 3600000).toLocaleTimeString("zh-CN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        生成
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
