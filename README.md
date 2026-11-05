# Safiri · School Bus Tracking

Live school bus tracking for schools: one system for the **transport desk**, the **driver** and the **parent**.

Built as a working demo around a Nairobi school — 5 routes, 5 buses, 138 students — with a
server-side GPS simulator so the whole product runs end to end without hardware.

```
npm install
npm run dev        # http://localhost:3000
```

| Route      | Who it's for                  |
| ---------- | ----------------------------- |
| `/console` | Transport manager / school ops |
| `/parent`  | Guardian (mobile)             |
| `/driver`  | Driver + bus attendant (mobile) |

## What's in it

**Operations console** — every bus on one live map with a fleet rail, KPI strip (students on board,
on-time %, open alerts, attendance), alert triage with acknowledge, and an activity feed. Click a bus
for a live trip sheet: stop timeline with per-stop roster, full manifest, crew contact, fuel and
vehicle data.

**Parent app** — live position of the child's bus, countdown to *their* stop, boarding/drop-off
status, trip log, notification preferences, and a direct line to the transport desk.

**Driver app** — next stop with expected student count, tap-to-board roster that updates the school
dashboard, full manifest grouped by stop, incident reporting and a panic button.

**Simulated GPS** — `lib/sim.ts` moves every bus around a continuous round trip: park at the first
stop → morning pickup run → handover at school → afternoon drop-off run → back out. Positions are
continuous at both turnarounds, so nothing teleports. One scripted breakdown (R-04 on Lang'ata Road)
gives the console something real to react to.

## Design language

Dark olive-charcoal canvas (`#10150e`), lime accent (`#c9f27a`), soft rounded cards and pill
buttons. The map is a dark topographic style — a deep green-charcoal ground, faint contour lines,
mossy parks and a glowing accent route line.

The whole UI paints from CSS custom properties, so the palette is swappable at runtime:

| Token | Role |
| ----- | ---- |
| `--color-canvas` | deepest layer behind the app frames |
| `--color-paper` / `--color-paper-2` / `--color-paper-3` | page, card, raised surface |
| `--color-line` | hairlines |
| `--color-ink-50…900` | text scale, **inverted** (900 = brightest) |
| `--color-brand-100…900` | lime accent ramp (100 = dim tint, 600 = the accent) |

Every page has a **Background** control (top right) with dark presets (Olive, Forest, Graphite,
Midnight) and two light ones, plus an exact-hex field. Light and dark are handled properly: picking a
light background flips the ink scale to dark text, picking a dark one flips it back. The choice is
saved to `localStorage` and re-applied by a pre-paint script, so there is no flash on reload or
navigation.

To change the default look, edit the `@theme` block in `app/globals.css`. To add a preset, add it to
`PALETTES` in `components/ThemePicker.tsx` — and mirror the token math in the boot script inside
`app/layout.tsx`.

## Architecture

```
app/
  page.tsx              landing / portal picker
  console/              ops console (client shell over the live snapshot)
  parent/               guardian app
  driver/               driver app
  api/snapshot/route.ts single JSON endpoint the whole UI reads
components/
  MapCanvas.tsx         hand-drawn vector basemap of Nairobi (no tiles, no API key)
  FleetMap.tsx          live buses with smoothed interpolation
  BusDetail.tsx         trip sheet drawer
  ui.tsx                pills, avatars, rings, sparklines
lib/
  sim.ts                simulation engine (positions, ETAs, alerts, events)
  data.ts               routes, stops, students, crew, guardians
  basemap.ts            roads, parks, river, area labels
  geo.ts                haversine, bearing, path projection, smoothing
  useLiveSnapshot.ts    polling hook with error recovery
```

The UI reads one endpoint, `GET /api/snapshot`, roughly every 1.3 s. Bus markers ease toward each
new position with `requestAnimationFrame`, so the map stays fluid between ticks.

Simulated time runs at **10×** wall clock (`TIME_SCALE` in `lib/sim.ts`) — a full school run takes a
couple of minutes to watch. Change it there for demos, or set it to `1` to reason about real timings.

## Why the map is hand-drawn

`components/MapCanvas.tsx` renders Nairobi from data: 17 roads as classed polylines, 7 parks and
forests, the Nairobi River, and area labels, projected with a local equirectangular transform. No
Mapbox/Google key, no tile requests, no attribution obligations, and it paints on the first frame.
The same component re-projects to any centre/zoom, which is how the parent and trip-sheet maps get
their close-ups.

To use real geography later, swap `MapCanvas` for MapLibre and keep the same `project()` contract —
`FleetMap` only needs a `LatLng → {x, y}` function.

## Going to production

The demo is deliberately self-contained. The gaps to close:

1. **Real GPS ingest** — post device fixes to a placeholder route (`/api/ping`) and write them to a
   `bus_positions` table; replace `snapshotAt()` with a query. The tracker payload the simulator
   models is just `{ busId, lat, lng, speedKph, heading, at }`.
2. **Auth** — Supabase Auth (or similar) with three roles: `school_admin`, `driver`, `guardian`.
   Guardians must only ever see their own children — enforce that with row-level security, not in the UI.
3. **Realtime** — swap the polling hook for a Supabase Realtime subscription on `bus_positions`;
   the hook's return shape (`{ snapshot, error }`) is designed to drop straight into it.
4. **Notifications** — boarding and drop-off confirmations, 10-minute ETA warnings, and delay/
   breakdown alerts via SMS or push. The alert records already carry the `kind` and severity.
5. **Multi-tenant** — `Route.schoolId` exists; scope routes, students and users by school.
6. **Data protection** — children's location data is sensitive personal data under Kenya's Data
   Protection Act. Keep retention windows short, restrict who can see live positions, and log every
   access to a child's location.

## Demo data

All names, plates, phone numbers and students are fictional. Stop names and roads are real Nairobi
places so the map reads correctly.
