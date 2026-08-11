import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Bliss Rooms Job System</h1>
        <p className="text-sm text-neutral-500">任务 · 打卡 · 工资</p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
