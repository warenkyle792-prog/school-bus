export function fmtDuration(sec: number): string {
  const s = Math.abs(Math.round(sec));
  const m = Math.floor(s / 60);
  if (m < 1) return "<1 min";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60}`;
}

export function signedMin(sec: number): string {
  const m = Math.round(sec / 60);
  if (m === 0) return "on time";
  return m > 0 ? `+${m} min` : `${m} min`;
}

export function relTime(atSec: number, nowSec: number): string {
  const d = Math.max(0, nowSec - atSec);
  if (d < 60) return `${Math.max(1, Math.round(d))}s ago`;
  if (d < 3600) return `${Math.round(d / 60)} min ago`;
  return `${Math.round(d / 3600)} h ago`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");
