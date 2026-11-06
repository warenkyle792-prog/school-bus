"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/format";

const NAV = [
  { href: "/console", label: "Console" },
  { href: "/parent", label: "Parent" },
  { href: "/driver", label: "Driver" },
];

export default function AppBar({
  clock,
  right,
}: {
  clock?: string;
  right?: React.ReactNode;
}) {
  const path = usePathname();
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line bg-paper/85 px-4 backdrop-blur-xl sm:px-5">
      <div className="flex items-center gap-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-canvas">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 17V7a2 2 0 0 1 2-2h9l3 4v8" strokeLinecap="round" />
              <path d="M4 11h14M4 17h1.5M20 17h-1.5" strokeLinecap="round" />
              <circle cx="7.5" cy="17.5" r="1.6" />
              <circle cx="16.5" cy="17.5" r="1.6" />
            </svg>
          </span>
          <span className="text-[15px] font-semibold tracking-tight">Safiri</span>
        </Link>

        <nav className="hidden items-center gap-0.5 sm:flex">
          {NAV.map((n) => {
            const active = path.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cx(
                  "rounded-full px-3 py-1.5 text-[13px] font-medium transition",
                  active ? "bg-paper-3 text-ink-900" : "text-ink-500 hover:bg-paper-2 hover:text-ink-800"
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {clock && (
          <span className="num hidden items-center gap-1.5 rounded-full border border-line bg-paper-2 px-2.5 py-1 text-[12px] font-medium text-ink-700 sm:flex">
            <svg viewBox="0 0 16 16" className="size-3.5 text-ink-400" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="8" cy="8" r="6" />
              <path d="M8 4.8V8l2.2 1.4" strokeLinecap="round" />
            </svg>
            {clock}
          </span>
        )}
        {right}
      </div>
    </header>
  );
}
