"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AccountPopoverProps {
  user: { email: string; name?: string; isAdmin?: boolean } | null;
}

export default function AccountPopover({ user }: AccountPopoverProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, close]);

  if (!user) return null;

  const initials = (user.name || user.email).slice(0, 1).toUpperCase();
  const displayName = user.name || user.email.split("@")[0];

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 transition-all duration-200 hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-[13px] font-semibold text-white">
          {initials}
        </div>
        <span className="hidden text-[13px] font-medium text-text-primary sm:inline">
          {displayName}
        </span>
      </button>

      {open && (
        <div
          className="glass absolute right-0 top-full z-50 mt-2 w-[240px] overflow-hidden rounded-[var(--radius-lg)] py-1.5 shadow-[var(--shadow-xl)]"
          role="menu"
          style={{
            animation: "popover-in 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94) both",
          }}
        >
          <div className="border-b border-border px-4 py-3">
            <p className="text-[13px] font-medium text-text-primary">{displayName}</p>
            <p className="mt-0.5 truncate text-[12px] text-text-tertiary">{user.email}</p>
          </div>

          <div className="py-1.5">
            <Link
              href="/profile"
              onClick={close}
              className="flex items-center gap-3 px-4 py-2 text-[13px] text-text-secondary transition-colors hover:bg-black/[0.03] hover:text-text-primary dark:hover:bg-white/[0.05]"
              role="menuitem"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Profile
            </Link>
            <Link
              href="/topics"
              onClick={close}
              className="flex items-center gap-3 px-4 py-2 text-[13px] text-text-secondary transition-colors hover:bg-black/[0.03] hover:text-text-primary dark:hover:bg-white/[0.05]"
              role="menuitem"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              My Interests
            </Link>
            <Link
              href="/reports"
              onClick={close}
              className="flex items-center gap-3 px-4 py-2 text-[13px] text-text-secondary transition-colors hover:bg-black/[0.03] hover:text-text-primary dark:hover:bg-white/[0.05]"
              role="menuitem"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16v16H4z" />
                <path d="M8 8h8M8 12h8M8 16h5" />
              </svg>
              Briefings
            </Link>
            {user.isAdmin && (
              <Link
                href="/admin"
                onClick={close}
                className="flex items-center gap-3 px-4 py-2 text-[13px] text-text-secondary transition-colors hover:bg-black/[0.03] hover:text-text-primary dark:hover:bg-white/[0.05]"
                role="menuitem"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v18M3 12h18" />
                  <circle cx="12" cy="12" r="8" />
                </svg>
                Admin
              </Link>
            )}
          </div>

          <div className="border-t border-border py-1.5">
            <button
              onClick={async () => {
                close();
                await fetch("/api/auth/logout", { method: "POST" });
                router.replace("/login");
                router.refresh();
              }}
              className="flex w-full items-center gap-3 px-4 py-2 text-[13px] text-text-secondary transition-colors hover:bg-[var(--danger)]/5 hover:text-[var(--danger)]"
              role="menuitem"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
