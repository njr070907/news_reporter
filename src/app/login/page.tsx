import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/reports");
  return (
    <div className="mx-auto mt-16 w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">每日时讯简报</h1>
      <p className="mt-2 text-sm text-neutral-500">
        自选主题，每天一份可溯源的 AI 简报。
      </p>
      <LoginForm />
    </div>
  );
}
