"use client";

import { useActionState } from "react";
import { changePassword } from "../../actions";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="space-y-3">
      {[
        ["current", "Current password", "current-password"],
        ["next", "New password", "new-password"],
        ["confirm", "Confirm new password", "new-password"],
      ].map(([name, label, autoComplete]) => (
        <div key={name}>
          <label className="label" htmlFor={name}>
            {label}
          </label>
          <input id={name} name={name} type="password" className="input" autoComplete={autoComplete} required />
        </div>
      ))}
      {state?.error && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{state.error}</p>}
      {state?.success && <p className="rounded-lg bg-good-soft px-3 py-2 text-sm text-good">{state.success}</p>}
      <button className="btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}
