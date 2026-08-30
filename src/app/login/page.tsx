import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/reports");
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-6">
      <div className="relative w-full max-w-[360px]">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-[var(--accent-glow)] opacity-20 blur-[100px]" />

        <div className="relative text-center">
          <h1 className="text-[28px] font-semibold tracking-tight text-text-primary">
            News Reporter
          </h1>
          <p className="mt-2 text-[15px] text-text-secondary">
            Your personal AI news briefing.
          </p>
        </div>

        <div className="mt-8 glass rounded-[var(--radius-xl)] p-8 shadow-[var(--shadow-lg)]">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
