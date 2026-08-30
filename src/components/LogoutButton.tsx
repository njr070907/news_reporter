"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/login");
        router.refresh();
      }}
      className="rounded-full px-3 py-1.5 text-[13px] text-text-tertiary transition-colors hover:text-text-primary hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
    >
      Sign Out
    </button>
  );
}
