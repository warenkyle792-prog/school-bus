import Link from "next/link";
import MapCanvas from "@/components/MapCanvas";
import ThemePicker, { ThemeBoot } from "@/components/ThemePicker";
import { LiveBadge } from "@/components/ui";

const portals = [
  {
    href: "/console",
    title: "Operations console",
    body: "Every bus on one live map, fleet health, delays and driver contact.",
    tag: "Transport manager",
    accent: "#c9f27a",
  },
  {
    href: "/parent",
    title: "Parent app",
    body: "Live location, ETA to the gate and boarding confirmation for your child.",
    tag: "Guardian",
    accent: "#79a8ff",
  },
  {
    href: "/driver",
    title: "Driver app",
    body: "Today's manifest, stop-by-stop boarding and one-tap incident reports.",
    tag: "Driver & attendant",
    accent: "#ffb066",
  },
];

export default function Home() {
  return (
    <main className="min-h-dvh bg-canvas">
      <ThemeBoot />
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-12">
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
              <p className="text-[11px] text-ink-500">School bus tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemePicker />
            <LiveBadge label="Demo live" />
          </div>
        </div>

        {/* hero: photo-style card with overlay copy, like the reference */}
        <div className="relative mt-8 overflow-hidden rounded-[1.75rem] border border-line">
          <MapCanvas view={{ center: { lat: -1.2935, lng: 36.8122 }, zoom: 1.05 }} labels={false} className="h-[420px] sm:h-[440px]" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-canvas via-canvas/55 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-9">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-600/30 bg-brand-100/80 px-2.5 py-1 text-[10.5px] font-bold tracking-wide text-brand-700 uppercase backdrop-blur">
              <span className="size-1.5 rounded-full bg-brand-600" />
              Riverside Academy · Nairobi
            </span>
            <h1 className="mt-3 max-w-2xl text-3xl leading-[1.06] font-semibold tracking-tight sm:text-5xl">
              Smart tracking for a<br />
              <span className="text-brand-600">safer school journey</span>
            </h1>
            <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-ink-600 sm:text-sm">
              See the bus move in real time, know the moment your child boards, and get an ETA
              before the gate opens.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link
                href="/console"
                className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-[12.5px] font-bold text-canvas shadow-[0_0_28px_-6px_rgba(201,242,122,0.5)] transition hover:bg-brand-500"
              >
                Open operations console
                <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link
                href="/parent"
                className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-2/70 px-5 py-2.5 text-[12.5px] font-semibold text-ink-800 backdrop-blur transition hover:border-ink-300"
              >
                See the parent view
              </Link>
            </div>
          </div>
        </div>

        {/* portal cards */}
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {portals.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="group card p-5 transition hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: p.accent, boxShadow: `0 0 8px ${p.accent}80` }} />
                <p className="label">{p.tag}</p>
              </div>
              <p className="mt-2.5 text-[15px] font-semibold tracking-tight">{p.title}</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-500">{p.body}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand-600">
                Open
                <svg viewBox="0 0 16 16" className="size-3 transition group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-ink-400">
          <span>5 routes · 138 students · simulated GPS</span>
          <span className="hidden sm:inline">·</span>
          <span>Works offline-first, dark by default</span>
        </div>
      </div>
    </main>
  );
}
