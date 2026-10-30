import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <main className="grid flex-1 place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-accent text-xl text-accent-ink">
            ◉
          </div>
          <h1 className="text-2xl font-bold">Scream Team</h1>
          <p className="text-sm text-muted">Close it before it haunts you.</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
