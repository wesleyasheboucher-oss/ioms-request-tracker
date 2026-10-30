import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logout } from "../actions";
import { NavLinks } from "./nav-links";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const links = [
    { href: "/", label: "Log ticket" },
    { href: "/my-tickets", label: "My tickets" },
    { href: "/leaderboard", label: "Leaderboard" },
    ...(user.role === "manager" ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <div className="flex items-center gap-2 font-semibold">
            <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-ink">
              ◉
            </span>
            <span>Scream Team</span>
            <span className="hidden text-sm font-normal text-muted sm:inline">iOMS Points</span>
          </div>
          <NavLinks links={links} />
          <div className="ml-auto flex items-center gap-3 text-sm">
            <Link href="/account" className="text-muted hover:text-ink">
              {user.display_name}
            </Link>
            <form action={logout}>
              <button className="text-muted underline-offset-2 hover:text-ink hover:underline">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
