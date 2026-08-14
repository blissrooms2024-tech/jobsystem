import { SignupForm } from "@/components/signup-form";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-purple-50/50 px-4 py-10">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-purple-900">Bliss Rooms Job System</h1>
        <p className="text-sm text-neutral-500">员工注册 Employee Sign Up</p>
      </div>
      <SignupForm />
    </main>
  );
}
