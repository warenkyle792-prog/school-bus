# Safiri · School Bus Tracking

Live school bus tracking: one system for the **transport desk**, the **driver** and the **parent**.

Seeded with a Nairobi school — 5 routes, 5 buses, 138 students — so every screen is populated on
first run. Bus positions come from a built-in simulator until real GPS trackers are connected;
everything else (registration, mess**aging, reminders, scoping) runs against real stored data.

## What is real vs. what is simulated

| Real | Simulated / not yet wired |
| --- | --- |
| Bus & driver registration, assignment, persistence | GPS positions (`lib/sim.ts`) |
| School → parent messages (stored, delivered in-app) | Authentication — roles are fixed sessions |
| Parent scoping to their household | SMS / push delivery |
| ETA maths, pickup reminder state machine | Student attendance from hardware taps |

The UI never claims otherwise: the sign-in screen states the three things to connect before going
live, and the console marks buses whose tracker has not reported as **Off GPS**.

```
npm install
npm run dev             # development, http://localhost:3000
npm run build && npm start   # production build, served from .next-build
```

> **Build output is isolated on purpose.** `build`/`start` use `.next-build` so running a build
> can never overwrite the chunks a running `next dev` is serving — doing that makes pages render
> but never hydrate, which looks exactly like a hung app.

Open `/` for the sign-in screen (transport manager, parent, driver).

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

**Parent app** — scoped to one household: a guardian sees **only the buses their own children
ride**, never the fleet. Per child it shows the live position, a countdown to *their* pickup stop,
boarding status and trip log. Parents can set a **5 / 10 / 15-minute pickup reminder** that fires as
a notification when the bus is that close, and there is a **two-way emergency channel** per route so
the driver can reach every guardian at once.

**Driver app** — next stop with expected student count, tap-to-board roster that updates the school
dashboard, full manifest grouped by stop, a **Parents** tab with one-tap broadcast templates
(delayed, traffic, almost there, breakdown), incident reporting and a panic button.

**Fleet registration** — the console's **Buses** tab registers real vehicles and drivers and assigns
them to routes. Registered buses join the same live GPS map as the simulated fleet, labelled `new`.

**Simulated GPS** — `lib/sim.ts` moves every bus around a continuous round trip: park at the first
stop → morning pickup run → handover at school → afternoon drop-off run → back out. Positions are
continuous at both turnarounds, so nothing teleports. One scripted breakdown (R-04 on Lang'ata Road)
gives the console something real to react to.

## Design language

**Royal Charcoal** surfaces with a lime accent (`#c9f27a`), soft rounded cards and pill buttons. The
map is a dark topographic style — neutral charcoal ground, faint contour lines, and a glowing accent
route line.

The surface scale is neutral grey, taken from the reference swatch card:

| Token | Hex | Role |
| ----- | --- | ---- |
| `--color-canvas` | `#131316` | deepest layer behind the app frames |
| `--color-paper` | `#1e2023` | page background |
| `--color-card-top` → `--color-card-bottom` | `#4a4c50` → `#3a3c40` | card surface, vertical gradient |
| `--color-paper-3` | `#4c4e51` | raised / selected surface |
| `--color-line` | `#24262a` | hairlines |

Cards use a soft vertical gradient rather than a flat fill, which is what gives the reference its
weighted, material feel.

Text contrast was checked against the *card top*, the hardest surface: `ink-900` 8.0:1, `ink-800`
6.8:1, `ink-700` 5.6:1, `ink-600` 4.7:1 (all pass AA), with `ink-500` 3.7:1 reserved for
non-essential secondary detail.

The whole UI paints from CSS custom properties, so the palette is swappable at runtime:

| Token | Role |
| ----- | ---- |
| `--color-canvas` | deepest layer behind the app frames |
| `--color-paper` / `--color-paper-2` / `--color-paper-3` | page, card, raised surface |
| `--color-line` | hairlines |
| `--color-ink-50…900` | text scale, **inverted** (900 = brightest) |
| `--color-brand-100…900` | lime accent ramp (100 = dim tint, 600 = the accent) |

Every page has a **Background** control (top right) with dark presets (Royal, Charcoal, Graphite,
Slate) and two light ones, plus an exact-hex field. Light and dark are handled properly: picking a
light background flips the ink scale to dark text, picking a dark one flips it back. The choice is
saved to `localStorage` and re-applied by a pre-paint script, so there is no flash on reload or
navigation.

To change the default look, edit the `@theme` block in `app/globals.css`. To add a preset, add it to
`PALETTES` in `components/ThemePicker.tsx` — and mirror the token math in the boot script inside
`app/layout.tsx`.

## Parent scoping, ETAs, reminders and comms

**Scoping.** Guardians are modelled as *households*: each guardian owns 1–3 children, and the parent
app derives everything from `students.filter(s => s.guardianId === me)`. The demo household (g-01)
spans two routes on purpose, so the "your buses" list shows 2 of 5 vehicles — never the fleet. On the
server this must be enforced with row-level security, not by the UI filter.

**ETAs** live in `lib/eta.ts` and are shared by the app and the notification endpoint, so the
reminder can never disagree with the screen. `etaToStop(bus, route, stop)` returns time-to-*that*
stop (not to the school), the straight-line distance, and whether the bus has already passed. Delay
is additive but clamped so a bus running early never produces a negative ETA.

**Reminders.** The guardian picks a lead time (5/10/15 min). The app computes `etaSec - leadMin*60`
and moves through `scheduled → due → fired`, with `passed` and `offline` as terminal states. The
reminder is recalculated from the live snapshot on every poll, so it self-corrects when traffic
changes rather than needing to be re-set.

```
GET /api/notifications?children=st-013,st-021&lead=10
→ { reminders: [{ state, etaSec, firesInSec, message }], messages: [...] }
```

In production the `due` transition should be computed server-side per guardian and pushed (FCM/APNs
or SMS) by a cron or a snapshot-triggered job — the shape above is already what a worker would send.

**Comms.** One thread per route rather than private DMs: when a bus breaks down, one message has to
reach every guardian, and parents need to see that others were told. Drivers get one-tap templates
tagged `emergency | delay | info`; emergency messages render with a red emergency badge. Guardians
without a child on the route get a read-only view.

**School → parent broadcast** is a real, persisted action, not a button that flashes a tick. The
transport desk opens any bus's trip sheet, writes a message, marks it Update / Delay / Emergency and
sends. Recipients are computed from the same filter the parent app uses, so the "11 households"
shown is the count that actually receives it, and the message survives a reload.

```
GET  /api/broadcasts?route=r-03   → { broadcasts: [...] }
POST /api/broadcasts              → { routeId, body, priority, title }
```

## Registering buses and drivers

Open **Console → Buses**. From there a school can:

- **Register a bus** — plate, model, seats, route, attendant and GPS tracker ID
- **Add a driver** — name, phone, licence number, years driving
- **Assign a driver** to any bus from the inline dropdown, and move them between buses
- **Send a bus to maintenance** and back, or **show it on the map**

Plates are normalised and de-duplicated (`kdl 900z` → `KDL 900Z`), a driver can only be on one
active bus at a time, and a bus whose tracker is blank is registered but shows as **Off GPS** rather
than silently vanishing — that distinction matters when a school is chasing hardware.

Data lives in `.data/fleet.json` (git-ignored) behind `/api/fleet`, with the registry cached in memory
and writes serialised through a promise chain so concurrent submits can't corrupt the file. Writes go
via temp-file + rename, so a crash mid-write can't truncate the registry.

```
GET    /api/fleet          → { buses, drivers }
POST   /api/fleet          → { kind: "bus" | "driver", ... }
PATCH  /api/fleet/:id      → { driverId } | { status: "active" | "maintenance" }
DELETE /api/fleet/:id
```

Registration is validated **server-side** — plate format, seat count, route existence, duplicate plate
and driver double-booking — because the form is not a security boundary once real auth is added.

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

### First paint

All three portals are server-rendered with a live snapshot (`lib/getSnapshot.ts`, shared with
`GET /api/snapshot`), so the console opens populated instead of starting on a spinner. The client
hook is seeded with that snapshot and polls on top of it. There is one process-wide clock
(`lib/serverClock.ts`) so the page and the API never disagree about what time the simulator is at.

### Connection handling

A console that silently freezes on a weak connection is worse than one that says so. So
`useLiveSnapshot` has an 8 s request timeout, keeps the last good snapshot through a blip, counts
consecutive failures, backs off up to 15 s while failing and snaps back on success. After two
failures the UI shows a **stale banner** with the age of the data and a retry, rather than pretending
the numbers are live. Before the first successful load, `LoadingState` explains what it is waiting
for and offers a retry after 8 s instead of spinning forever.

### The school day

The simulator is driven by **time of day**, not by how long the server has been up — a bus is on the
road at 07:10 and parked overnight, and the console clock always agrees with the leg each bus claims
to be on:

| Clock (EAT) | Phase | What happens |
| --- | --- | --- |
| before 06:40 | Before service | buses parked at their first stop |
| 06:40 – 07:40 | Morning pickup | fills up stop by stop, arrives at school |
| 07:40 – 15:30 | In session | everyone handed over, buses parked at school |
| 15:30 – 16:40 | Afternoon drop-off | empties stop by stop in reverse |
| after 16:40 | Service finished | buses return to the yard |

Each route stretches its own timetable to fit that envelope, so the slowest route (R-05, 14.6 km)
still arrives on time. `TIME_SCALE` (60) accelerates the clock only — a simulated minute still takes
a real minute, but the positions track the clock exactly.

`solution.phase` is exposed in the snapshot so the UI can explain a quiet console ("Service finished
— morning run tomorrow 06:40") instead of looking broken, and occupancy is derived from the drawn
position rather than a running total — which is what keeps the on-board count honest during the
reverse drop-off leg.

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
   models is just `{ busId, lat, lng, speedKph, heading, at }`, keyed by the `trackerId` captured at
   registration. A registered bus with no recent fix should flip to `offline`, which the UI already
   renders.
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
