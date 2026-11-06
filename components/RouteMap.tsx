"use client";

import MapCanvas, { type Projector } from "./MapCanvas";
import type { Bus, LatLng, Stop } from "@/lib/types";

type Props = {
  bus: Bus;
  path: LatLng[];
  color: string;
  stops: Stop[];
  school: LatLng;
  /** Stops to draw with a label, a count badge and the "pickup here" pulse. */
  highlight?: { stopId: string; count: number; label: string }[];
  /** Live distances, e.g. "240 m" shown under a highlighted stop. */
  distanceLabels?: Record<string, string>;
  /** The one stop the bus is heading for right now. */
  nextStopId?: string;
  zoom?: number;
};

/**
 * The bus map shared by the parent and driver apps.
 *
 * Draws the route, every stop, the school and the live bus, and annotates the
 * stops that matter to the signed-in user — a guardian's own pickup point, or
 * the driver's next stop — with the number of children to be picked up and the
 * bus's straight-line distance from that stop.
 */
export default function RouteMap({
  bus,
  path,
  color,
  stops,
  school,
  highlight = [],
  distanceLabels = {},
  nextStopId,
  zoom = 2.9,
}: Props) {
  const highlighted = new Set(highlight.map((h) => h.stopId));

  return (
    <MapCanvas view={{ center: bus.position, zoom }} labels={false} className="absolute inset-0">
      {(project: Projector) => {
        const b = project(bus.position);
        const sc = project(school);
        const d = path
          .map((pt, i) => {
            const p = project(pt);
            return `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          })
          .join(" ");

        return (
          <svg width="100%" height="100%" className="absolute inset-0">
            <path d={d} fill="none" stroke="#17181b" strokeWidth="9" strokeLinecap="round" strokeOpacity="0.7" />
            <path d={d} fill="none" stroke={color} strokeWidth="3.4" strokeLinecap="round" strokeOpacity="0.9" />

            {/* every stop on the route, muted unless it is one of "mine" */}
            {stops.map((stop) => {
              const p = project(stop.coord);
              if (highlighted.has(stop.id)) return null;
              return (
                <circle
                  key={stop.id}
                  cx={p.x}
                  cy={p.y}
                  r="3.4"
                  fill="#17181b"
                  stroke={color}
                  strokeWidth="1.6"
                  strokeOpacity="0.75"
                />
              );
            })}

            {/* bus → my stop: the distance the user actually cares about */}
            {highlight.map((h) => {
              const stop = stops.find((s) => s.id === h.stopId);
              if (!stop) return null;
              const p = project(stop.coord);
              const isNext = nextStopId === h.stopId;
              return (
                <g key={h.stopId}>
                  <line
                    x1={b.x}
                    y1={b.y}
                    x2={p.x}
                    y2={p.y}
                    stroke={color}
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    strokeOpacity="0.65"
                  />
                  {isNext && <circle cx={p.x} cy={p.y} r="19" fill={color} opacity="0.13" />}
                  <circle cx={p.x} cy={p.y} r="12" fill="#17181b" stroke={color} strokeWidth="2.5" />
                  <text
                    x={p.x}
                    y={p.y + 4}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="700"
                    fill={color}
                  >
                    {h.count}
                  </text>
                  <text
                    x={p.x}
                    y={p.y + 27}
                    textAnchor="middle"
                    fontSize="9.5"
                    fontWeight="700"
                    fill="#d2f888"
                  >
                    {h.label}
                  </text>
                  {distanceLabels[h.stopId] && (
                    <text
                      x={p.x}
                      y={p.y + 39}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="600"
                      fill="#a6aab1"
                    >
                      {distanceLabels[h.stopId]}
                    </text>
                  )}
                </g>
              );
            })}

            {/* school */}
            <g>
              <circle cx={sc.x} cy={sc.y} r="6" fill="#c9f27a" stroke="#17181b" strokeWidth="2" />
            </g>

            {/* the bus itself */}
            <circle cx={b.x} cy={b.y} r="15" fill={color} opacity="0.18" />
            <circle cx={b.x} cy={b.y} r="8.5" fill={color} stroke="#17181b" strokeWidth="2.5" />
          </svg>
        );
      }}
    </MapCanvas>
  );
}
