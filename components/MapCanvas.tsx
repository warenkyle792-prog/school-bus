"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LABELS } from "@/lib/basemap";
import { toRad } from "@/lib/geo";
import type { LatLng } from "@/lib/types";

export type Viewport = { center: LatLng; zoom: number };
export const NAIROBI_VIEW: Viewport = { center: { lat: -1.2935, lng: 36.8122 }, zoom: 1 };

type Props = {
  view?: Viewport;
  children?: ReactNode | ((p: Projector) => ReactNode);
  className?: string;
  labels?: boolean;
};

export type Projector = (p: LatLng) => { x: number; y: number };

/**
 * Aerial basemap of Nairobi.
 *
 * The reference is a photographic satellite view with interface panels floating
 * on top of it, so the ground is a real aerial photograph rather than a drawn
 * vector tile. It is darkened and desaturated to the Royal Charcoal range and a
 * vignette keeps the edges from competing with the lime route line, which is the
 * only bright thing on the map.
 *
 * The image is a single cover-fitted layer: no tiles, no API key, instant paint.
 */
export default function MapCanvas({
  view = NAIROBI_VIEW,
  children,
  className = "",
  labels = true,
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

  return (
    <div
      ref={ref}
      className={`relative isolate overflow-hidden bg-canvas ${className}`}
    >
      {/* photographic aerial ground */}
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url(/nairobi-aerial.jpg)",
          // pushed toward charcoal so lime route lines and glass panels read
          filter: "saturate(0.78) brightness(0.52) contrast(1.06)",
        }}
      />

      {/* charcoal wash + edge vignette: the map recedes, the UI stays on top */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 95% at 50% 42%, rgba(19,20,23,0.10) 0%, rgba(19,20,23,0.38) 58%, rgba(17,18,20,0.88) 100%)",
        }}
      />

      {labels && (
        <svg width="100%" height="100%" className="absolute inset-0" style={{ display: "block" }}>
          {LABELS.filter((l) => l.kind === "park" || l.kind === "area").map((l) => {
            const { x, y } = project(l.at);
            const park = l.kind === "park";
            return (
              <text
                key={l.name}
                x={x}
                y={y}
                textAnchor="middle"
                fill={park ? "rgba(226,228,232,0.42)" : "rgba(226,228,232,0.30)"}
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
      )}

      {typeof children === "function" ? children(project) : children}
    </div>
  );
}
