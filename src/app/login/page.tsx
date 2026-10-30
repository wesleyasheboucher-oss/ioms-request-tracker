import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Ghost } from "@/components/spooky";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <main className="grid flex-1 place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Ghost className="anim-bob mx-auto mb-2 w-20 drop-shadow-[0_0_24px_#9b6bff88]" />
          <h1 className="font-spooky text-5xl tracking-wide text-accent">Scream Team</h1>
          <p className="mt-1 text-sm text-muted">Close it before it haunts you.</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
