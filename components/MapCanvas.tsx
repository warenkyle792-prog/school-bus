"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CONTOURS, LABELS, PARKS, RIVER, ROADS } from "@/lib/basemap";
import { toRad } from "@/lib/geo";
import type { LatLng } from "@/lib/types";

export type Viewport = { center: LatLng; zoom: number };
export const NAIROBI_VIEW: Viewport = { center: { lat: -1.2935, lng: 36.8122 }, zoom: 1 };

type Props = {
  view?: Viewport;
  children?: ReactNode | ((p: Projector) => ReactNode);
  className?: string;
  labels?: boolean;
  minHeight?: number;
  /** Rounded inner frame, like the reference's map panels */
  inset?: boolean;
};

export type Projector = (p: LatLng) => { x: number; y: number };

/**
 * Hand-drawn dark topographic basemap of Nairobi, modelled on the reference:
 * deep charcoal-green ground, faint contour lines, mossy parks, a glowing
 * accent route and small area labels. No tiles, no API key, instant paint.
 */
export default function MapCanvas({
  view = NAIROBI_VIEW,
  children,
  className = "",
  labels = true,
  minHeight = 0,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 960, h: 640 });

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
      style={{
        minHeight,
        background:
          "radial-gradient(120% 90% at 20% 10%, #232c1e 0%, #1a2217 42%, #141b12 78%, #10160e 100%)",
      }}
    >
      <svg width="100%" height="100%" className="absolute inset-0" style={{ display: "block" }}>
        <defs>
          <pattern id="topo-dots" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.9" fill="#3a4530" />
          </pattern>
          <radialGradient id="map-vignette" cx="50%" cy="42%" r="78%">
            <stop offset="55%" stopColor="#0e140c" stopOpacity="0" />
            <stop offset="100%" stopColor="#0b110a" stopOpacity="0.85" />
          </radialGradient>
          <filter id="route-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="100%" height="100%" fill="url(#topo-dots)" opacity="0.7" />

        {/* contour lines — the topographic texture from the reference */}
        {CONTOURS.map((line, i) => (
          <path
            key={`c-${i}`}
            d={toPath(line, true)}
            fill="none"
            stroke="#39442e"
            strokeWidth={i % 4 === 0 ? 1.1 : 0.7}
            strokeOpacity={i % 4 === 0 ? 0.75 : 0.5}
          />
        ))}

        {/* land cover */}
        {PARKS.map((poly) => (
          <path
            key={poly.name}
            d={toPath(poly.ring, true)}
            fill={poly.kind === "water" ? "#16302f" : poly.kind === "forest" ? "#1d3320" : "#22351f"}
            stroke={poly.kind === "water" ? "#1f4442" : "#2c4529"}
            strokeWidth="0.8"
            strokeOpacity="0.9"
          />
        ))}

        <path
          d={toPath(RIVER)}
          fill="none"
          stroke="#1b3a3c"
          strokeWidth="5"
          strokeLinecap="round"
          strokeOpacity="0.9"
        />

        {/* roads: dark casing with a subtle lighter fill so they read without shouting */}
        {ROADS.map((road) => {
          const primary = road.class === "primary";
          return (
            <g key={road.name}>
              <path d={toPath(road.path)} fill="none" stroke="#0d130b" strokeWidth={primary ? 7 : 5} strokeLinecap="round" strokeOpacity="0.85" />
              <path
                d={toPath(road.path)}
                fill="none"
                stroke={primary ? "#3f4a37" : "#303a2a"}
                strokeWidth={primary ? 4.4 : 3.2}
                strokeLinecap="round"
                strokeOpacity={primary ? 0.95 : 0.85}
              />
            </g>
          );
        })}

        <rect width="100%" height="100%" fill="url(#map-vignette)" />

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
                fill={park ? "#4d6242" : "#6d7a63"}
                fontSize={park ? 8.5 : l.size === "sm" ? 8 : 9}
                fontWeight={park ? 500 : 600}
                letterSpacing={park ? "0.14em" : "0.03em"}
                style={{ textTransform: park ? "uppercase" : "none", userSelect: "none" }}
              >
                {l.name}
              </text>
            );
          })}
      </svg>

      {typeof children === "function" ? children(project) : children}

      <div className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_70px_rgba(0,0,0,0.55)]" />
    </div>
  );
}
