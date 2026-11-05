"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MapCanvas, { NAIROBI_VIEW } from "./MapCanvas";
import type { Bus, Snapshot } from "@/lib/types";

type Props = {
  snapshot: Snapshot;
  selectedBusId: string | null;
  onSelect: (id: string | null) => void;
  focusRouteId: string | null;
  onFocusRoute: (id: string | null) => void;
  onOpenBus: (id: string) => void;
};

/** Smoothly eases displayed coordinates toward the latest server position. */
function useSmoothedPositions(buses: Bus[]) {
  const [shown, setShown] = useState<Record<string, { lat: number; lng: number }>>({});
  const target = useRef<Record<string, { lat: number; lng: number }>>({});
  const raf = useRef<number | null>(null);

  useEffect(() => {
    for (const b of buses) target.current[b.id] = b.position;
    setShown((prev) => {
      const next = { ...prev };
      for (const b of buses) if (!next[b.id]) next[b.id] = b.position;
      return next;
    });
  }, [buses]);

  useEffect(() => {
    const step = () => {
      setShown((prev) => {
        const next: typeof prev = {};
        let moved = false;
        for (const id of Object.keys(target.current)) {
          const t = target.current[id];
          const c = prev[id];
          if (!c) {
            next[id] = t;
            moved = true;
            continue;
          }
          const dLat = t.lat - c.lat;
          const dLng = t.lng - c.lng;
          if (Math.abs(dLat) < 1e-6 && Math.abs(dLng) < 1e-6) {
            next[id] = t;
          } else {
            next[id] = { lat: c.lat + dLat * 0.14, lng: c.lng + dLng * 0.14 };
            moved = true;
          }
        }
        return moved ? next : prev;
      });
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  return shown;
}

export default function FleetMap({
  snapshot,
  selectedBusId,
  onSelect,
  focusRouteId,
  onFocusRoute,
  onOpenBus,
}: Props) {
  const shown = useSmoothedPositions(snapshot.buses);
  const [hover, setHover] = useState<string | null>(null);

  const visibleRoutes = useMemo(
    () => (focusRouteId ? snapshot.routes.filter((r) => r.id === focusRouteId) : snapshot.routes),
    [snapshot.routes, focusRouteId]
  );

  const school = snapshot.school.coord;

  return (
    <MapCanvas view={NAIROBI_VIEW} className="h-full w-full rounded-[1.35rem]">
      {(project) => {
        const s = project(school);
        return (
          <>
            <svg width="100%" height="100%" className="absolute inset-0" style={{ display: "block" }}>
              <defs>
                <filter id="path-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {visibleRoutes.map((route) => {
                const dim = focusRouteId && focusRouteId !== route.id;
                const d = route.path
                  .map((pt, i) => `${i === 0 ? "M" : "L"}${project(pt).x.toFixed(1)},${project(pt).y.toFixed(1)}`)
                  .join(" ");
                return (
                  <g key={route.id} opacity={dim ? 0.18 : 1}>
                    <path d={d} fill="none" stroke="#131417" strokeWidth={focusRouteId === route.id ? 9 : 7} strokeLinecap="round" strokeOpacity={0.75} />
                    <path
                      d={d}
                      fill="none"
                      stroke={route.color}
                      strokeWidth={focusRouteId === route.id ? 4 : 2.6}
                      strokeLinecap="round"
                      strokeOpacity={0.92}
                      filter={focusRouteId === route.id ? "url(#path-glow)" : undefined}
                      className="transition-all duration-300"
                    />
                  </g>
                );
              })}

              {/* stop pins */}
              {visibleRoutes.map((route) =>
                route.stops.map((stop) => {
                  const { x, y } = project(stop.coord);
                  const active = focusRouteId === route.id;
                  return (
                    <g key={stop.id} className="cursor-pointer" onClick={() => onFocusRoute(active ? null : route.id)}>
                      <circle cx={x} cy={y} r={active ? 6 : 4.2} fill="#17181b" stroke={route.color} strokeWidth="2.2" />
                      <circle cx={x} cy={y} r={active ? 2.6 : 1.8} fill={route.color} />
                      {active && (
                        <text x={x + 11} y={y + 3.5} fontSize="9.5" fontWeight="600" fill="#3c5f52">
                          {stop.name}
                        </text>
                      )}
                    </g>
                  );
                })
              )}

              {/* school marker */}
              <g>
                <circle cx={s.x} cy={s.y} r="26" fill="#c9f27a" opacity="0.12" />
                <circle cx={s.x} cy={s.y} r="17" fill="#c9f27a" opacity="0.18" />
                <circle cx={s.x} cy={s.y} r="11" fill="#17181b" stroke="#c9f27a" strokeWidth="2.4" />
                <path
                  d={`M${s.x - 4.6},${s.y + 0.4} L${s.x + 4.6},${s.y + 0.4} M${s.x},${s.y - 4.6} L${s.x},${s.y + 4.6}`}
                  stroke="#c9f27a"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <text x={s.x + 18} y={s.y + 4} fontSize="11" fontWeight="700" fill="#d2f888">
                  {snapshot.school.shortName}
                </text>
              </g>
            </svg>

            {/* buses as DOM so they can be styled, hovered and clicked */}
            {snapshot.buses.map((bus) => {
              const pos = shown[bus.id] ?? bus.position;
              const { x, y } = project(pos);
              const route = snapshot.routes.find((r) => r.id === bus.routeId)!;
              const selected = selectedBusId === bus.id;
              const dim = focusRouteId && focusRouteId !== bus.routeId;
              const critical = bus.status === "breakdown";
              return (
                <button
                  key={bus.id}
                  onClick={() => {
                    onSelect(bus.id);
                    onFocusRoute(bus.routeId);
                  }}
                  onDoubleClick={() => onOpenBus(bus.id)}
                  onMouseEnter={() => setHover(bus.id)}
                  onMouseLeave={() => setHover(null)}
                  className="group absolute -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300"
                  style={{ left: x, top: y, opacity: dim ? 0.3 : 1, zIndex: selected ? 30 : 20 }}
                  aria-label={`${route.code} ${route.name}`}
                >
                  {critical && (
                    <span className="absolute inset-0 -m-2 animate-ping rounded-full bg-berry-500/40" />
                  )}
                  <span
                    className={`relative grid size-8 place-items-center rounded-full border-2 border-canvas text-canvas shadow-lg transition-transform duration-200 group-hover:scale-110 ${
                      selected ? "ring-2 ring-ink-900/20 scale-110" : ""
                    }`}
                    style={{ background: critical ? "#ec4d68" : route.color }}
                  >
                    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 16V8a2 2 0 0 1 2-2h8l2 3v7" strokeLinecap="round" />
                      <path d="M5 16h1.2M18 16h-1.2" strokeLinecap="round" />
                      <circle cx="8" cy="16.6" r="1.3" />
                      <circle cx="15" cy="16.6" r="1.3" />
                    </svg>
                  </span>

                  {(hover === bus.id || selected) && (
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2.5 w-max -translate-x-1/2 rounded-lg border border-line bg-paper-3 px-2.5 py-1.5 text-left shadow-xl">
                      <p className="text-[11px] font-semibold text-ink-900">{route.code} · {bus.plate}</p>
                      <p className="num text-[10px] text-ink-300">
                        {bus.speedKph} kph · {bus.onBoard}/{bus.capacity} on board
                      </p>
                    </div>
                  )}
                </button>
              );
            })}
          </>
        );
      }}
    </MapCanvas>
  );
}
