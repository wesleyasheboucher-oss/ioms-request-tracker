import { requireUser } from "@/lib/auth";
import { ChangePasswordForm } from "./change-password-form";

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold">{user.display_name}</h1>
      <p className="mb-6 text-sm text-muted">
        Signed in as {user.username} · {user.role === "manager" ? "Manager" : "Rep"}
        {user.lane && ` · ${user.lane}`}
      </p>
      <div className="card p-5">
        <h2 className="mb-4 font-semibold">Change password</h2>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
