import { requireManager } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatDay } from "@/lib/dates";
import { heldDaysAwaitingReview } from "@/lib/stats";
import { confirmDay, updateUser } from "./actions";
import { CreateUserForm, ResetPasswordForm } from "./forms";

type UserRow = {
  id: number;
  username: string;
  display_name: string;
  role: "rep" | "manager";
  lane: string | null;
  active: boolean;
  tickets: number;
};

export default async function AdminPage() {
  const me = await requireManager();
  const sql = await getDb();
  const [users, held] = await Promise.all([
    sql<UserRow[]>`
      select u.id, u.username, u.display_name, u.role, u.lane, u.active,
             (select count(*) from ioms.tickets t where t.user_id = u.id)::int as tickets
        from ioms.users u
       order by u.active desc, u.role, u.display_name`,
    heldDaysAwaitingReview(),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Admin</h1>

      {held.length > 0 && (
        <section className="card border-warn/40 p-5">
          <h2 className="font-semibold">Held days awaiting review</h2>
          <p className="mb-3 text-sm text-muted">
            Days at 300+ points don&apos;t count toward prizes until you confirm them.
          </p>
          <ul className="divide-y divide-line text-sm">
            {held.map((h) => (
              <li key={`${h.user_id}-${h.work_date}`} className="flex items-center justify-between gap-3 py-2.5">
                <span>
                  <b>{h.display_name}</b> · {formatDay(h.work_date, { weekday: "short" })} ·{" "}
                  {h.points} pts from {h.logged} tickets
                </span>
                <form action={confirmDay}>
                  <input type="hidden" name="user_id" value={h.user_id} />
                  <input type="hidden" name="work_date" value={h.work_date} />
                  <button className="btn-ghost py-1.5">Confirm</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="card overflow-x-auto">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-semibold">Team logins</h2>
            <p className="text-sm text-muted">Reps appear on the leaderboard. Managers don&apos;t.</p>
          </div>
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-muted uppercase">
              <tr>
                <th className="px-5 py-2.5 font-medium">Name</th>
                <th className="px-3 py-2.5 font-medium">Role</th>
                <th className="px-3 py-2.5 font-medium">Lane</th>
                <th className="px-3 py-2.5 font-medium">Active</th>
                <th className="px-3 py-2.5" />
                <th className="px-5 py-2.5 font-medium">Password</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => {
                const formId = `user-${u.id}`;
                const self = u.id === me.id;
                return (
                  <tr key={u.id} className={u.active ? undefined : "opacity-55"}>
                    <td className="px-5 py-3">
                      <p className="font-medium">{u.display_name}</p>
                      <p className="text-xs text-muted">
                        {u.username} · {u.tickets} tickets
                      </p>
                      <form id={formId} action={updateUser}>
                        <input type="hidden" name="id" value={u.id} />
                      </form>
                    </td>
                    <td className="px-3 py-3">
                      <select
                        form={formId}
                        name="role"
                        defaultValue={u.role}
                        disabled={self}
                        className="input w-auto py-1.5"
                      >
                        <option value="rep">Rep</option>
                        <option value="manager">Manager</option>
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <input
                        form={formId}
                        name="lane"
                        defaultValue={u.lane ?? ""}
                        placeholder="e.g. Cardiac & Ortho"
                        className="input py-1.5"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        form={formId}
                        type="checkbox"
                        name="active"
                        defaultChecked={!!u.active}
                        disabled={self}
                        className="size-4 accent-[var(--accent)]"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <button form={formId} className="btn-ghost py-1.5">
                        Save
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <ResetPasswordForm userId={u.id} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="card h-fit p-5">
          <h2 className="mb-4 font-semibold">Add a login</h2>
          <CreateUserForm />
        </div>
      </section>
    </div>
  );
}
