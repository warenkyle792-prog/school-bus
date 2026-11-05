"use client";

import { useEffect, useState } from "react";
import { cx } from "@/lib/format";

/** Background themes. `paper` is the page, `paper2` is card surface, `line` is the hairline. */
export type Palette = { id: string; name: string; paper: string; paper2: string; line: string };

export const PALETTES: Palette[] = [
  { id: "paper", name: "Paper", paper: "#f7f5ef", paper2: "#fffefa", line: "#e3e0d6" },
  { id: "porcelain", name: "Porcelain", paper: "#f4f6f4", paper2: "#ffffff", line: "#e2e7e1" },
  { id: "mint", name: "Mint", paper: "#eaf3ee", paper2: "#fafffc", line: "#d7e6db" },
  { id: "bone", name: "Bone", paper: "#f2eee4", paper2: "#fffdf7", line: "#e2dccc" },
  { id: "sand", name: "Sand", paper: "#f6ecdd", paper2: "#fffbf3", line: "#e7d9c2" },
  { id: "blueprint", name: "Blueprint", paper: "#eef2f7", paper2: "#ffffff", line: "#dce3ec" },
];

const STORAGE_KEY = "safiri.palette";

function clamp(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([a-f\d]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const v = parseInt(m[1], 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((n) => clamp(n).toString(16).padStart(2, "0")).join("")}`;
}

function mix(hex: string, target: string, amount: number) {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  if (!a || !b) return hex;
  return rgbToHex(
    a[0] + (b[0] - a[0]) * amount,
    a[1] + (b[1] - a[1]) * amount,
    a[2] + (b[2] - a[2]) * amount
  );
}

/** Build a coherent card + hairline from a single background colour. */
export function paletteFromHex(hex: string): Palette {
  const clean = hex.startsWith("#") ? hex : `#${hex}`;
  return {
    id: "custom",
    name: "Custom",
    paper: clean,
    paper2: mix(clean, "#ffffff", 0.62),
    line: mix(clean, "#10201b", 0.12),
  };
}

export function applyPalette(p: Palette) {
  const root = document.documentElement;
  root.style.setProperty("--color-paper", p.paper);
  root.style.setProperty("--color-paper-2", p.paper2);
  root.style.setProperty("--color-line", p.line);
  root.style.setProperty("--color-ink-50", mix(p.paper, "#ffffff", 0.4));
  root.style.setProperty("--color-ink-100", mix(p.paper, "#10201b", 0.055));
  root.dataset.palette = p.id;
}

export function loadSavedPalette(): Palette | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Palette;
    if (!saved?.paper) return null;
    return saved;
  } catch {
    return null;
  }
}

/** Runs once per page load so the chosen background survives navigation. */
export function ThemeBoot() {
  useEffect(() => {
    const saved = loadSavedPalette();
    if (saved) applyPalette(saved);
  }, []);
  return null;
}

export default function ThemePicker({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<Palette>(PALETTES[0]);
  const [hex, setHex] = useState("#f7f5ef");

  useEffect(() => {
    const saved = loadSavedPalette();
    if (saved) {
      setCurrent(saved);
      setHex(saved.paper);
    }
  }, []);

  const choose = (p: Palette) => {
    applyPalette(p);
    setCurrent(p);
    setHex(p.paper);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch {
      /* private mode — theme still applies for this session */
    }
  };

  const onHex = (value: string) => {
    setHex(value);
    if (/^#?[a-f\d]{6}$/i.test(value.trim())) choose(paletteFromHex(value.trim()));
  };

  return (
    <div className={cx("relative", className)}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Change background colour"
        className="flex items-center gap-1.5 rounded-full border border-line bg-paper-2 px-2.5 py-1.5 text-[11.5px] font-medium text-ink-600 transition hover:border-ink-300"
      >
        <span
          className="size-3.5 rounded-full ring-1 ring-ink-900/10"
          style={{ background: current.paper }}
        />
        <span className="hidden sm:inline">Background</span>
      </button>

      {open && (
        <>
          <button
            aria-label="Close colour picker"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute top-full right-0 z-50 mt-2 w-[236px] rounded-xl border border-line bg-paper-2 p-3 shadow-xl">
            <p className="label">Background colour</p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {PALETTES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => choose(p)}
                  className={cx(
                    "group overflow-hidden rounded-lg border text-left transition",
                    current.paper === p.paper ? "border-ink-900/30 ring-1 ring-ink-900/10" : "border-line hover:border-ink-300"
                  )}
                >
                  <span className="block h-6 w-full" style={{ background: p.paper }}>
                    <span
                      className="mt-1 ml-1 block h-2 w-3 rounded-[2px]"
                      style={{ background: p.paper2, border: `1px solid ${p.line}` }}
                    />
                  </span>
                  <span className="block truncate px-1.5 py-1 text-[10px] font-medium text-ink-600">{p.name}</span>
                </button>
              ))}
            </div>

            <label className="mt-3 block">
              <span className="label">Exact hex</span>
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className="size-7 shrink-0 rounded-md ring-1 ring-ink-900/10"
                  style={{ background: /^#?[a-f\d]{6}$/i.test(hex.trim()) ? hex : current.paper }}
                />
                <input
                  value={hex}
                  onChange={(e) => onHex(e.target.value)}
                  spellCheck={false}
                  placeholder="#f7f5ef"
                  className="num w-full rounded-md border border-line bg-paper px-2 py-1.5 text-[11.5px] text-ink-800 outline-none focus:border-brand-400"
                />
              </div>
            </label>

            <button
              onClick={() => {
                choose(PALETTES[0]);
                localStorage.removeItem(STORAGE_KEY);
              }}
              className="mt-2.5 w-full rounded-md py-1.5 text-[11px] font-medium text-ink-500 hover:bg-ink-100"
            >
              Reset to default
            </button>
          </div>
        </>
      )}
    </div>
  );
}
