"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AccountPopover from "./AccountPopover";

interface NavUser {
  email: string;
  name?: string;
}

export default function SiteHeaderInner({ user }: { user: NavUser | null }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 10);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navItems = user
    ? [
        { href: "/", label: "Today" },
        { href: "/reports", label: "Reports" },
        { href: "/topics", label: "Topics" },
      ]
    : [];

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "glass shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center px-6">
        <Link
          href={user ? "/" : "/login"}
          className="text-[15px] font-semibold tracking-tight text-text-primary transition-opacity hover:opacity-70"
        >
          News Reporter
        </Link>

        {user && (
          <nav className="ml-10 flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-200 ${
                  pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-text-secondary hover:text-text-primary hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <AccountPopover user={user} />
          ) : (
            <Link
              href="/login"
              className="btn-capsule btn-secondary text-[13px]"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
