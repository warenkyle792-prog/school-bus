import type { LatLng } from "./types";

const R = 6371; // km

export const toRad = (d: number) => (d * Math.PI) / 180;
export const toDeg = (r: number) => (r * 180) / Math.PI;

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function bearing(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Catmull-Rom smoothing so polylines look like roads rather than star charts. */
export function smoothPath(points: LatLng[], segments = 12): LatLng[] {
  if (points.length < 3) return points;
  const out: LatLng[] = [];
  const p = [points[0], ...points, points[points.length - 1]];
  for (let i = 0; i < p.length - 3; i++) {
    const p0 = p[i];
    const p1 = p[i + 1];
    const p2 = p[i + 2];
    const p3 = p[i + 3];
    for (let j = 0; j < segments; j++) {
      const t = j / segments;
      const t2 = t * t;
      const t3 = t2 * t;
      const lat =
        0.5 *
        (2 * p1.lat +
          (-p0.lat + p2.lat) * t +
          (2 * p0.lat - 5 * p1.lat + 4 * p2.lat - p3.lat) * t2 +
          (-p0.lat + 3 * p1.lat - 3 * p2.lat + p3.lat) * t3);
      const lng =
        0.5 *
        (2 * p1.lng +
          (-p0.lng + p2.lng) * t +
          (2 * p0.lng - 5 * p1.lng + 4 * p2.lng - p3.lng) * t2 +
          (-p0.lng + 3 * p1.lng - 3 * p2.lng + p3.lng) * t3);
      out.push({ lat, lng });
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

export function pathLengthKm(path: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += haversineKm(path[i - 1], path[i]);
  return total;
}

/** Point at a given fraction (0..1) of total path length. */
export function pointAlong(path: LatLng[], t: number): LatLng {
  if (path.length === 0) return { lat: 0, lng: 0 };
  if (path.length === 1) return path[0];
  const clamped = Math.max(0, Math.min(1, t));
  let total = 0;
  const legs: number[] = [];
  for (let i = 1; i < path.length; i++) {
    const d = haversineKm(path[i - 1], path[i]);
    legs.push(d);
    total += d;
  }
  let target = clamped * total;
  for (let i = 0; i < legs.length; i++) {
    if (target <= legs[i] || i === legs.length - 1) {
      const f = legs[i] === 0 ? 0 : target / legs[i];
      return {
        lat: path[i].lat + (path[i + 1].lat - path[i].lat) * f,
        lng: path[i].lng + (path[i + 1].lng - path[i].lng) * f,
      };
    }
    target -= legs[i];
  }
  return path[path.length - 1];
}

/** Nearest point on a path + its arc-length fraction. */
export function projectOntoPath(path: LatLng[], p: LatLng): { point: LatLng; t: number } {
  let best = { point: path[0], t: 0, d: Number.POSITIVE_INFINITY };
  let total = 0;
  const legs: number[] = [];
  for (let i = 1; i < path.length; i++) {
    const d = haversineKm(path[i - 1], path[i]);
    legs.push(d);
    total += d;
  }
  let passed = 0;
  for (let i = 0; i < legs.length; i++) {
    const a = path[i];
    const b = path[i + 1];
    const steps = 8;
    for (let s = 0; s <= steps; s++) {
      const f = s / steps;
      const cand = { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f };
      const d = haversineKm(cand, p);
      if (d < best.d) best = { point: cand, t: (passed + legs[i] * f) / total, d };
    }
    passed += legs[i];
  }
  return { point: best.point, t: total === 0 ? 0 : best.t };
}

export const fmtClock = (d: Date) =>
  d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

export const fmtMin = (min: number) => {
  const m = Math.max(0, Math.round(min));
  if (m === 0) return "now";
  return `${m} min`;
};

export const pad = (n: number) => String(n).padStart(2, "0");
