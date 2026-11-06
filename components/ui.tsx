"use client";

import type { Bus, RunStatus } from "@/lib/types";
import { cx, initials } from "@/lib/format";

const STATUS: Record<RunStatus, { label: string; dot: string; bg: string; text: string }> = {
  on_time: { label: "On time", dot: "bg-brand-600", bg: "bg-brand-100", text: "text-brand-600" },
  delayed: { label: "Delayed", dot: "bg-sun-500", bg: "bg-sun-100", text: "text-sun-600" },
  breakdown: { label: "Breakdown", dot: "bg-berry-500", bg: "bg-berry-100", text: "text-berry-600" },
  finished: { label: "At school", dot: "bg-sky-500", bg: "bg-sky-100", text: "text-sky-600" },
  offline: { label: "Off GPS", dot: "bg-ink-400", bg: "bg-ink-100", text: "text-ink-600" },
};

export function StatusPill({ status, size = "md" }: { status: RunStatus; size?: "sm" | "md" }) {
  const s = STATUS[status];
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full font-semibold",
        s.bg,
        s.text,
        size === "sm" ? "px-2 py-0.5 text-[10.5px]" : "px-2.5 py-1 text-[11.5px]"
      )}
    >
      <span className={cx("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

export function Avatar({
  name,
  hue,
  size = 32,
  ring,
}: {
  name: string;
  hue: number;
  size?: number;
  ring?: boolean;
}) {
  return (
    <span
      className={cx(
        "inline-grid shrink-0 place-items-center rounded-full font-semibold",
        ring && "ring-2 ring-paper-2"
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `hsl(${hue} 34% 22%)`,
        color: `hsl(${hue} 62% 76%)`,
        boxShadow: `inset 0 0 0 1px hsl(${hue} 30% 30% / 0.9)`,
      }}
    >
      {initials(name)}
    </span>
  );
}

export function RouteChip({
  code,
  color,
  name,
  onClick,
  active,
}: {
  code: string;
  color: string;
  name?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition",
        active
          ? "border-brand-600/40 bg-brand-600 text-canvas"
          : "border-white/12 bg-paper/60 text-ink-700 backdrop-blur-md hover:border-white/25 hover:text-ink-900"
      )}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ background: active ? "#131316" : color, boxShadow: active ? "none" : `0 0 6px ${color}` }}
      />
      {code}
      {name && <span className="font-normal opacity-60">{name}</span>}
    </button>
  );
}

export function Sparkline({
  data,
  color = "#c9f27a",
  width = 96,
  height = 28,
  fill = true,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  fill?: boolean;
}) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1 || 1)) * width;
    const y = height - ((v - min) / span) * (height - 3) - 1.5;
    return [x, y] as const;
  });
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${d} L${width},${height} L0,${height} Z`;
  const id = `spark-${color.replace("#", "")}`;
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.24" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${id})`} />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.2" fill={color} />
    </svg>
  );
}

export function OccupancyBar({ bus }: { bus: Bus }) {
  const pct = Math.min(100, Math.round((bus.onBoard / bus.capacity) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
      <div
        className={cx(
          "h-full rounded-full transition-all duration-700",
          pct > 92 ? "bg-berry-500" : pct > 75 ? "bg-sun-500" : "bg-brand-600"
        )}
        style={{ width: `${pct}%`, boxShadow: pct > 92 ? "none" : "0 0 10px -2px currentColor" }}
      />
    </div>
  );
}

export function Ring({
  value,
  size = 56,
  stroke = 5,
  color = "#c9f27a",
  track = "#262e21",
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (Math.min(100, Math.max(0, value)) / 100) * c}
          className="transition-all duration-700"
          style={{ filter: `drop-shadow(0 0 4px ${color}55)` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export function LiveBadge({ label = "Live" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-600/25 bg-brand-100 px-2 py-0.5 text-[10.5px] font-semibold tracking-wide text-brand-600 uppercase">
      <span className="relative inline-flex size-1.5">
        <span className="live-dot absolute inset-0 rounded-full text-brand-600" />
        <span className="relative size-1.5 rounded-full bg-brand-600" />
      </span>
      {label}
    </span>
  );
}

/** Primary call-to-action, straight from the reference: full-width lime pill. */
export function AccentButton({
  children,
  onClick,
  className = "",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-[12.5px] font-bold text-canvas transition",
        "hover:bg-brand-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60",
        "shadow-[0_0_24px_-6px_rgba(201,242,122,0.45)]",
        className
      )}
    >
      {children}
    </button>
  );
}
