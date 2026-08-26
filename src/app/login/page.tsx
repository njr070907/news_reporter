import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/reports");
  return (
    <div className="mx-auto mt-20 w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">登录</h1>
      <p className="mt-2 text-sm text-neutral-500">
        输入邮箱即可进入。首次登录会自动为你创建账户并预置推荐主题。
      </p>
      <LoginForm />
      <p className="mt-6 text-xs leading-relaxed text-neutral-400">
        MVP 过渡方案为邮箱直登，未做邮箱验证；接入 Google OAuth 与邮件验证码将在后续版本完成。
      </p>
    </div>
  );
}
