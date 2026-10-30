"use client";

import { useActionState, useEffect, useRef } from "react";
import { createUser, resetPassword } from "./actions";

export function CreateUserForm() {
  const [state, action, pending] = useActionState(createUser, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.success) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-3">
      <div>
        <label className="label" htmlFor="display_name">
          Name
        </label>
        <input id="display_name" name="display_name" className="input" placeholder="Bianca" required />
      </div>
      <div>
        <label className="label" htmlFor="username">
          Username
        </label>
        <input id="username" name="username" className="input" placeholder="bianca" autoComplete="off" required />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Temporary password
        </label>
        <input id="password" name="password" className="input" autoComplete="new-password" minLength={8} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="role">
            Role
          </label>
          <select id="role" name="role" className="input">
            <option value="rep">Rep</option>
            <option value="manager">Manager</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="lane">
            Lane
          </label>
          <input id="lane" name="lane" className="input" placeholder="Ortho / DME" />
        </div>
      </div>
      {state?.error && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{state.error}</p>}
      {state?.success && <p className="rounded-lg bg-good-soft px-3 py-2 text-sm text-good">{state.success}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Adding…" : "Add login"}
      </button>
    </form>
  );
}

export function ResetPasswordForm({ userId }: { userId: number }) {
  const [state, action, pending] = useActionState(resetPassword, undefined);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={userId} />
      <input
        name="password"
        placeholder="New password"
        autoComplete="new-password"
        className="input w-32 py-1.5"
        minLength={8}
        required
      />
      <button className="btn-ghost py-1.5" disabled={pending}>
        Reset
      </button>
      {state?.error && <span className="text-xs text-bad">{state.error}</span>}
      {state?.success && <span className="text-xs text-good">✓</span>}
    </form>
  );
}
