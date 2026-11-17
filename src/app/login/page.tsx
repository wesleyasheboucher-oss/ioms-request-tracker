import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Tree } from "@/components/festive";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <main className="grid flex-1 place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Tree className="anim-glow mx-auto mb-2 w-20" />
          <h1 className="font-festive text-5xl tracking-wide text-accent">Scream Team</h1>
          <p className="mt-1 text-sm text-muted">Making a list, checking it twice.</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
