import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

export default async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <div className="mx-auto flex h-14 w-full max-w-4xl items-center gap-6 px-4">
        <Link href={user ? "/reports" : "/login"} className="font-semibold tracking-tight">
          每日时讯简报
        </Link>
        {user ? (
          <>
            <nav className="flex gap-4 text-sm">
              <Link href="/reports" className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
                简报
              </Link>
              <Link href="/topics" className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
                主题
              </Link>
            </nav>
            <span className="ml-auto hidden text-sm text-neutral-400 sm:inline">
              {user.email}
            </span>
            <LogoutButton />
          </>
        ) : (
          <Link
            href="/login"
            className="ml-auto rounded-full border border-black/15 px-4 py-1 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            登录
          </Link>
        )}
      </div>
    </header>
  );
}
