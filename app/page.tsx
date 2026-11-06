import Link from "next/link";
import ThemePicker, { ThemeBoot } from "@/components/ThemePicker";
import { LiveBadge } from "@/components/ui";

/**
 * Sign-in screen.
 *
 * There is no auth provider wired up yet, so this is a role chooser that signs
 * you into a session as a specific person. Once Supabase Auth is connected,
 * this page becomes the login form and the role comes from the JWT.
 */
const ROLES = [
  {
    href: "/console",
    role: "Transport manager",
    person: "Nadia Karemi",
    org: "Riverside Academy",
    scope: "All buses, all routes",
    accent: "#c9f27a",
    icon: "M4 17V7a2 2 0 0 1 2-2h9l3 4v8M4 11h14M4 17h1.5M20 17h-1.5",
    detail: "Fleet map, registration, alerts, parent comms",
  },
  {
    href: "/parent",
    role: "Parent",
    person: "Jabari Otieno",
    org: "3 children · 2 buses",
    scope: "Own household only",
    accent: "#79a8ff",
    icon: "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0",
    detail: "Live ETA, pickup reminders, driver messages",
  },
  {
    href: "/driver",
    role: "Driver",
    person: "Samuel Otieno",
    org: "R-01 · KDL 412X",
    scope: "Own route only",
    accent: "#ffb066",
    icon: "M12 4v9M12 17v.5M4 8l8-4 8 4",
    detail: "Run sheet, boarding, parent broadcasts",
  },
];

export default function Home() {
  return (
    <main className="min-h-dvh bg-canvas">
      <ThemeBoot />
      <div className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-brand-600 text-canvas">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 17V7a2 2 0 0 1 2-2h9l3 4v8" strokeLinecap="round" />
                <path d="M4 11h14M4 17h1.5M20 17h-1.5" strokeLinecap="round" />
                <circle cx="7.5" cy="17.5" r="1.6" />
                <circle cx="16.5" cy="17.5" r="1.6" />
              </svg>
            </span>
            <div>
              <p className="text-[15px] leading-tight font-semibold tracking-tight">Safiri</p>
              <p className="text-[11px] text-ink-500">School transport</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemePicker />
            <LiveBadge />
          </div>
        </div>

        <h1 className="mt-10 text-2xl font-semibold tracking-tight sm:text-3xl">Sign in</h1>

        <div className="mt-6 space-y-2.5">
          {ROLES.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              className="group card flex items-center gap-3.5 p-4 transition hover:border-ink-300"
            >
              <span
                className="grid size-10 shrink-0 place-items-center rounded-xl"
                style={{ background: `${r.accent}1f`, color: r.accent }}
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.9">
                  <path d={r.icon} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p className="truncate text-[13.5px] font-semibold">{r.person}</p>
                  <span className="shrink-0 rounded-full bg-ink-100 px-1.5 py-0.5 text-[9.5px] font-bold tracking-wide text-ink-600 uppercase">
                    {r.role}
                  </span>
                </div>
                <p className="truncate text-[11.5px] text-ink-500">{r.org}</p>
                <p className="mt-0.5 truncate text-[10.5px] text-ink-500">{r.detail}</p>
              </div>

              <div className="hidden shrink-0 text-right sm:block">
                <p className="text-[9.5px] font-semibold tracking-wide text-ink-500 uppercase">Scope</p>
                <p className="text-[10.5px] text-ink-600">{r.scope}</p>
              </div>

              <svg
                viewBox="0 0 16 16"
                className="size-4 shrink-0 text-ink-500 transition group-hover:translate-x-0.5 group-hover:text-ink-800"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
              >
                <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
