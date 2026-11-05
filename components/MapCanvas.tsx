"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LABELS, PARKS, RIVER, ROADS } from "@/lib/basemap";
import { toRad } from "@/lib/geo";
import type { LatLng } from "@/lib/types";

export type Viewport = { center: LatLng; zoom: number };
export const NAIROBI_VIEW: Viewport = { center: { lat: -1.2935, lng: 36.8122 }, zoom: 1 };

type Props = {
  view?: Viewport;
  children?: ReactNode | ((p: Projector) => ReactNode);
  className?: string;
  labels?: boolean;
  variant?: "light" | "night";
  minHeight?: number;
};

export type Projector = (p: LatLng) => { x: number; y: number };

/**
 * Hand-drawn vector basemap of Nairobi. Deliberately abstract — it renders in
 * ~1 frame, needs no tile server or API key, and never blocks on the network.
 */
export default function MapCanvas({
  view = NAIROBI_VIEW,
  children,
  className = "",
  labels = true,
  variant = "light",
  minHeight = 0,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 960, h: 640 });
  const night = variant === "night";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const project = useMemo<Projector>(() => {
    const { center, zoom } = view;
    const scale = 24000 * zoom;
    const latRad = toRad(center.lat);
    return (p: LatLng) => ({
      x: size.w / 2 + (p.lng - center.lng) * scale * Math.cos(latRad),
      y: size.h / 2 - (p.lat - center.lat) * scale,
    });
  }, [view, size.w, size.h]);

  const toPath = (pts: LatLng[], close = false) =>
    pts.map((pt, i) => `${i === 0 ? "M" : "L"}${project(pt).x.toFixed(1)},${project(pt).y.toFixed(1)}`).join(" ") +
    (close ? " Z" : "");

  return (
    <div
      ref={ref}
      className={`relative isolate overflow-hidden ${className}`}
      style={{ minHeight, background: night ? "#0b1a16" : "#eef1e8" }}
    >
      <svg width="100%" height="100%" className="absolute inset-0" style={{ display: "block" }}>
        <defs>
          <pattern id="grid-dots" width="26" height="26" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill={night ? "#1d3b32" : "#dfe4d6"} />
          </pattern>
          <radialGradient id="vignette" cx="50%" cy="45%" r="75%">
            <stop offset="60%" stopColor={night ? "#0b1a16" : "#eef1e8"} stopOpacity="0" />
            <stop offset="100%" stopColor={night ? "#071110" : "#e3e8dc"} stopOpacity="0.9" />
          </radialGradient>
          <filter id="soft-shadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#10201b" floodOpacity="0.18" />
          </filter>
        </defs>

        <rect width="100%" height="100%" fill="url(#grid-dots)" />

        {PARKS.map((poly) => (
          <path
            key={poly.name}
            d={toPath(poly.ring, true)}
            fill={
              poly.kind === "water"
                ? night ? "#123a3a" : "#c8dde2"
                : poly.kind === "forest"
                  ? night ? "#14332a" : "#d3e2cd"
                  : night ? "#173a2f" : "#dbe8d3"
            }
            stroke={poly.kind === "water" ? (night ? "#1d5252" : "#b2cfd6") : night ? "#1d4438" : "#cbdcc4"}
            strokeWidth="1"
          />
        ))}

        <path d={toPath(RIVER)} fill="none" stroke={night ? "#14494a" : "#c3dade"} strokeWidth="4.5" strokeLinecap="round" />

        {ROADS.map((road) => {
          const base = road.class === "primary" ? (night ? "#27443b" : "#ffffff") : night ? "#1c3730" : "#f7f8f2";
          const edge = night ? "#2f5348" : "#e2e5d9";
          return (
            <g key={road.name}>
              <path d={toPath(road.path)} fill="none" stroke={edge} strokeWidth={road.class === "primary" ? 7 : 5} strokeLinecap="round" />
              <path d={toPath(road.path)} fill="none" stroke={base} strokeWidth={road.class === "primary" ? 5.5 : 3.8} strokeLinecap="round" />
            </g>
          );
        })}

        <rect width="100%" height="100%" fill="url(#vignette)" />

        {labels &&
          LABELS.map((l) => {
            const { x, y } = project(l.at);
            const park = l.kind === "park";
            return (
              <text
                key={l.name}
                x={x}
                y={y}
                textAnchor="middle"
                fill={night ? (park ? "#3f6b58" : "#5b7a6e") : park ? "#8aa88f" : "#9aa79c"}
                fontSize={park ? 9 : l.size === "sm" ? 8.5 : 9.5}
                fontWeight={park ? 500 : 600}
                letterSpacing={park ? "0.08em" : "0.04em"}
                style={{ textTransform: park ? "uppercase" : "none", userSelect: "none" }}
              >
                {l.name}
              </text>
            );
          })}
      </svg>

      {typeof children === "function" ? children(project) : children}

      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_60px_rgba(16,32,27,0.06)]" />
    </div>
  );
}
