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

## Background colour

The whole UI paints from three CSS custom properties — `--color-paper` (page), `--color-paper-2`
(card surface) and `--color-line` (hairline). Tailwind emits them as `var()` references, so they can
be changed at runtime without a rebuild.

Every page has a **Background** control (top right) with six presets and an exact-hex field; the
choice is saved to `localStorage` and reapplied before first paint, so there is no flash. To change
the default, edit the `@theme` block in `app/globals.css` — or set `PALETTES` in
`components/ThemePicker.tsx` to make a preset the default.

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
