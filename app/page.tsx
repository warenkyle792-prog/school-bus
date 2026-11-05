import Link from "next/link";
import ThemePicker, { ThemeBoot } from "@/components/ThemePicker";

const portals = [
  {
    href: "/console",
    title: "Operations console",
    body: "Every bus on one live map, fleet health, delays and driver contact.",
    tag: "Transport manager",
    tone: "text-brand-600",
  },
  {
    href: "/parent",
    title: "Parent app",
    body: "Live location, ETA to the gate and boarding confirmation for your child.",
    tag: "Guardian",
    tone: "text-sky-600",
  },
  {
    href: "/driver",
    title: "Driver app",
    body: "Today's manifest, stop-by-stop boarding and one-tap incident reports.",
    tag: "Driver & attendant",
    tone: "text-sun-600",
  },
];

export default function Home() {
  return (
    <main className="min-h-dvh bg-paper">
      <ThemeBoot />
      <div className="mx-auto max-w-6xl px-6 py-14 sm:py-20">
        <div className="mb-6 flex justify-end">
          <ThemePicker />
        </div>
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-brand-700 text-paper-2 shadow-sm">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.9">
              <path d="M4 17V7a2 2 0 0 1 2-2h9l3 4v8" strokeLinecap="round" />
              <path d="M4 17h1.5M20 17h-1.5M4 11h14" strokeLinecap="round" />
              <circle cx="7.5" cy="17.5" r="1.8" />
              <circle cx="16.5" cy="17.5" r="1.8" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight">Safiri</p>
            <p className="text-xs text-ink-500">School bus tracking · Riverside Academy</p>
          </div>
        </div>

        <h1 className="mt-14 max-w-3xl text-4xl leading-[1.05] font-semibold tracking-tight sm:text-6xl">
          Every child accounted for,
          <span className="text-brand-600"> every metre of the way.</span>
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-600">
          One system for the transport desk, the driver and the parent. Live GPS, boarding
          confirmation at each stop, and ETA alerts that actually arrive before the bus does.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/console"
            className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-6 py-3 text-sm font-semibold text-paper-2 shadow-sm transition hover:bg-brand-800"
          >
            Open operations console
            <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link
            href="/parent"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-2 px-6 py-3 text-sm font-semibold text-ink-800 transition hover:border-ink-300"
          >
            See the parent view
          </Link>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {portals.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="card group p-6 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className={`label ${p.tone}`}>{p.tag}</p>
              <p className="mt-3 text-lg font-semibold tracking-tight">{p.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{p.body}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700">
                Open
                <svg viewBox="0 0 16 16" className="size-3.5 transition group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="1.9">
                  <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-14 text-xs text-ink-400">
          Demo data: 5 routes · 138 students · simulated GPS · Nairobi, Kenya
        </p>
      </div>
    </main>
  );
}
