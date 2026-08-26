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
      className="text-sm text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
    >
      登出
    </button>
  );
}
