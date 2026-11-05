import { smoothPath, pathLengthKm } from "./geo";
import type {
  Alert,
  Attendant,
  Bus,
  Driver,
  Guardian,
  LatLng,
  Route,
  School,
  Stop,
  Student,
} from "./types";

export const SCHOOL: School = {
  id: "sch-riverside",
  name: "Riverside Academy",
  shortName: "Riverside",
  coord: { lat: -1.2745, lng: 36.79 },
  city: "Nairobi",
  term: "Term 3 · 2026",
};

type StopSeed = { name: string; area: string; coord: LatLng; students: number };

type RouteSeed = {
  id: string;
  code: string;
  name: string;
  color: string;
  accent: string;
  driverId: string;
  attendantId: string;
  plate: string;
  capacity: number;
  phase: number;
  stops: StopSeed[];
  waypoints: LatLng[];
};

const S = SCHOOL.coord;

const ROUTE_SEEDS: RouteSeed[] = [
  {
    id: "r-01",
    code: "R-01",
    name: "Parklands · Westlands",
    color: "#c9f27a",
    accent: "emerald",
    driverId: "d-01",
    attendantId: "a-01",
    plate: "KDL 412X",
    capacity: 46,
    phase: 0.18,
    stops: [
      { name: "Highridge Estate", area: "Parklands", coord: { lat: -1.2602, lng: 36.8331 }, students: 7 },
      { name: "Parklands Sports Club", area: "Parklands", coord: { lat: -1.2626, lng: 36.8219 }, students: 9 },
      { name: "Sarit Centre", area: "Westlands", coord: { lat: -1.2613, lng: 36.8057 }, students: 11 },
      { name: "Westlands Roundabout", area: "Westlands", coord: { lat: -1.2691, lng: 36.8044 }, students: 6 },
      { name: "Riverside Drive", area: "Riverside", coord: { lat: -1.2738, lng: 36.7876 }, students: 4 },
    ],
    waypoints: [
      { lat: -1.2612, lng: 36.8266 },
      { lat: -1.2628, lng: 36.8152 },
      { lat: -1.2655, lng: 36.8062 },
      { lat: -1.2725, lng: 36.8001 },
      { lat: -1.2748, lng: 36.7942 },
    ],
  },
  {
    id: "r-02",
    code: "R-02",
    name: "Kilimani · Kileleshwa",
    color: "#79a8ff",
    accent: "blue",
    driverId: "d-02",
    attendantId: "a-02",
    plate: "KDJ 883B",
    capacity: 42,
    phase: 0.42,
    stops: [
      { name: "Yaya Centre", area: "Kilimani", coord: { lat: -1.2928, lng: 36.7863 }, students: 8 },
      { name: "Kilimani Primary", area: "Kilimani", coord: { lat: -1.2887, lng: 36.7818 }, students: 10 },
      { name: "Kileleshwa Ring Road", area: "Kileleshwa", coord: { lat: -1.2821, lng: 36.7764 }, students: 7 },
      { name: "Dennis Pritt Road", area: "Kileleshwa", coord: { lat: -1.2777, lng: 36.7798 }, students: 5 },
      { name: "Muthangari Drive", area: "Muthangari", coord: { lat: -1.2741, lng: 36.7871 }, students: 3 },
    ],
    waypoints: [
      { lat: -1.2908, lng: 36.7802 },
      { lat: -1.2848, lng: 36.7773 },
      { lat: -1.2796, lng: 36.7802 },
      { lat: -1.2758, lng: 36.7849 },
    ],
  },
  {
    id: "r-03",
    code: "R-03",
    name: "South B · South C",
    color: "#b79bff",
    accent: "violet",
    driverId: "d-03",
    attendantId: "a-03",
    plate: "KCX 219M",
    capacity: 48,
    phase: 0.61,
    stops: [
      { name: "South C Shopping Centre", area: "South C", coord: { lat: -1.3128, lng: 36.8327 }, students: 9 },
      { name: "Nyayo Highrise", area: "South B", coord: { lat: -1.3078, lng: 36.8274 }, students: 12 },
      { name: "Mombasa Road Junction", area: "South B", coord: { lat: -1.3021, lng: 36.8331 }, students: 6 },
      { name: "Bellevue", area: "South B", coord: { lat: -1.2962, lng: 36.8267 }, students: 8 },
      { name: "Nyayo Stadium", area: "Nairobi West", coord: { lat: -1.2971, lng: 36.8179 }, students: 4 },
    ],
    waypoints: [
      { lat: -1.3102, lng: 36.8296 },
      { lat: -1.3048, lng: 36.8318 },
      { lat: -1.2992, lng: 36.8249 },
      { lat: -1.2938, lng: 36.8175 },
      { lat: -1.2822, lng: 36.8041 },
    ],
  },
  {
    id: "r-04",
    code: "R-04",
    name: "Karen · Lang'ata",
    color: "#ffb066",
    accent: "amber",
    driverId: "d-04",
    attendantId: "a-04",
    plate: "KDC 771T",
    capacity: 44,
    phase: 0.33,
    stops: [
      { name: "Karen Centre", area: "Karen", coord: { lat: -1.3391, lng: 36.7092 }, students: 6 },
      { name: "Bogani Road", area: "Karen", coord: { lat: -1.3298, lng: 36.7251 }, students: 5 },
      { name: "Lang'ata Road", area: "Lang'ata", coord: { lat: -1.3231, lng: 36.7502 }, students: 9 },
      { name: "Nairobi Dam", area: "Lang'ata", coord: { lat: -1.3042, lng: 36.7898 }, students: 7 },
      { name: "Kibera Drive", area: "Kibera", coord: { lat: -1.2868, lng: 36.7902 }, students: 4 },
    ],
    waypoints: [
      { lat: -1.3352, lng: 36.7179 },
      { lat: -1.3268, lng: 36.7362 },
      { lat: -1.3138, lng: 36.7702 },
      { lat: -1.2958, lng: 36.7921 },
      { lat: -1.2792, lng: 36.7902 },
    ],
  },
  {
    id: "r-05",
    code: "R-05",
    name: "Buruburu · Donholm",
    color: "#5fe0d2",
    accent: "teal",
    driverId: "d-05",
    attendantId: "a-05",
    plate: "KDB 056Q",
    capacity: 50,
    phase: 0.07,
    stops: [
      { name: "Donholm Shopping Centre", area: "Donholm", coord: { lat: -1.2903, lng: 36.9012 }, students: 8 },
      { name: "Umoja Inner Core", area: "Umoja", coord: { lat: -1.2792, lng: 36.8951 }, students: 11 },
      { name: "Buruburu Phase 4", area: "Buruburu", coord: { lat: -1.2829, lng: 36.8742 }, students: 9 },
      { name: "Jogoo Road", area: "Makadara", coord: { lat: -1.2869, lng: 36.8568 }, students: 7 },
      { name: "Makadara Roundabout", area: "Makadara", coord: { lat: -1.2928, lng: 36.8411 }, students: 5 },
    ],
    waypoints: [
      { lat: -1.2885, lng: 36.8912 },
      { lat: -1.2815, lng: 36.8821 },
      { lat: -1.2851, lng: 36.8642 },
      { lat: -1.2905, lng: 36.8479 },
      { lat: -1.2838, lng: 36.8148 },
    ],
  },
];

const DWELL_SEC = 45;
const AVG_SPEED_KPH = 24;

function buildRoute(seed: RouteSeed): Route {
  const stopPoints = seed.stops.map((s) => s.coord).concat(S);
  const raw: LatLng[] = [];
  for (let i = 0; i < stopPoints.length; i++) {
    raw.push(stopPoints[i]);
    const wp = seed.waypoints[i];
    if (wp) raw.push(wp);
  }
  const path = smoothPath(raw, 10);
  const distanceKm = pathLengthKm(path);
  const driveSec = (distanceKm / AVG_SPEED_KPH) * 3600;
  const durationSec = Math.round(driveSec + DWELL_SEC * seed.stops.length);

  let acc = 0;
  const stops: Stop[] = seed.stops.map((s, i) => {
    const stop: Stop = {
      id: `${seed.id}-s${i + 1}`,
      name: s.name,
      area: s.area,
      coord: s.coord,
      offsetSec: Math.round(acc),
      students: s.students,
    };
    const next = stopPoints[i + 1] ?? S;
    const legKm = pathLengthKm([s.coord, next]);
    acc += (legKm / AVG_SPEED_KPH) * 3600 + DWELL_SEC;
    return stop;
  });

  return {
    id: seed.id,
    name: seed.name,
    code: seed.code,
    color: seed.color,
    schoolId: SCHOOL.id,
    stops,
    path,
    durationSec,
    distanceKm: Math.round(distanceKm * 10) / 10,
    direction: "morning",
  };
}

export const ROUTES: Route[] = ROUTE_SEEDS.map(buildRoute);

export const DRIVERS: Driver[] = [
  { id: "d-01", name: "Samuel Otieno", phone: "+254 722 118 340", licence: "DL-448211", rating: 4.9, yearsExp: 11, avatarHue: 158 },
  { id: "d-02", name: "Grace Wambui", phone: "+254 733 902 114", licence: "DL-771903", rating: 4.8, yearsExp: 8, avatarHue: 212 },
  { id: "d-03", name: "Peter Kimani", phone: "+254 711 445 662", licence: "DL-330774", rating: 4.7, yearsExp: 14, avatarHue: 268 },
  { id: "d-04", name: "Ali Hassan", phone: "+254 720 771 903", licence: "DL-905612", rating: 4.6, yearsExp: 6, avatarHue: 32 },
  { id: "d-05", name: "Mercy Achieng", phone: "+254 745 229 087", licence: "DL-118447", rating: 5.0, yearsExp: 9, avatarHue: 186 },
];

export const ATTENDANTS: Attendant[] = [
  { id: "a-01", name: "Faith Njeri", phone: "+254 701 220 118", avatarHue: 340 },
  { id: "a-02", name: "Brian Odhiambo", phone: "+254 702 918 442", avatarHue: 200 },
  { id: "a-03", name: "Esther Mutiso", phone: "+254 703 551 209", avatarHue: 286 },
  { id: "a-04", name: "Kevin Barasa", phone: "+254 704 667 331", avatarHue: 44 },
  { id: "a-05", name: "Lydia Chebet", phone: "+254 705 884 026", avatarHue: 168 },
];

const FIRST = [
  "Amani","Zawadi","Neema","Jabari","Tumaini","Baraka","Imani","Kamau","Wanjiru","Otieno",
  "Achieng","Mwangi","Naliaka","Kiptoo","Chebet","Zuri","Furaha","Maya","Leo","Nia",
  "Sifa","Rehema","Juma","Halima","Yusuf","Sanaa","Taji","Jelani","Makena","Thandi",
  "Kendi","Mutua","Nyokabi","Omondi","Wairimu","Njeri","Said","Adam","Lulu","Nuru",
];
const LAST = [
  "Kamau","Otieno","Wanjiru","Mwangi","Achieng","Kiptoo","Chebet","Onyango","Mutiso","Barasa",
  "Njoroge","Abdalla","Wekesa","Njeri","Maina","Ochieng","Karanja","Hassan","Odhiam","Wafula",
];

/** +254 7XX XXX XXX, deterministic. */
function formatKePhone(seed: number): string {
  const digits = String(seed).padStart(9, "0").slice(-9);
  return `+254 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
}

export const GUARDIANS: Guardian[] = Array.from({ length: 12 }).map((_, i) => {
  const first = FIRST[(i * 5 + 3) % FIRST.length];
  const last = LAST[(i * 7 + 1) % LAST.length];
  return {
    id: `g-${String(i + 1).padStart(2, "0")}`,
    name: `${first} ${last}`,
    phone: formatKePhone(720000000 + ((i * 7919 + 4021) % 9899999)),
    email: `${first.toLowerCase()}.${last.toLowerCase()}@mail.co.ke`,
    avatarHue: (i * 37 + 20) % 360,
  };
});

function gradeForAge(i: number) {
  const grades = ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8"];
  return grades[i % grades.length];
}

export const STUDENTS: Student[] = (() => {
  const out: Student[] = [];
  let n = 0;
  for (const route of ROUTES) {
    for (const stop of route.stops) {
      const count = Math.max(3, Math.round(stop.students * 0.75));
      for (let i = 0; i < count; i++) {
        const first = FIRST[n % FIRST.length];
        const last = LAST[(n * 11 + Math.floor(n / FIRST.length) * 3 + 4) % LAST.length];
        out.push({
          id: `st-${String(n + 1).padStart(3, "0")}`,
          name: `${first} ${last}`,
          grade: gradeForAge(n),
          class: `${gradeForAge(n).replace("Grade ", "")}${["A", "B", "C"][n % 3]}`,
          guardianId: GUARDIANS[n % GUARDIANS.length].id,
          stopId: stop.id,
          routeId: route.id,
          busId: `b-${route.code.replace("R-", "")}`,
          boardStatus: "waiting",
          avatarHue: (n * 47) % 360,
          photoTone: ["#E8F1EC", "#E9EFFA", "#F2ECFB", "#FBEFE3", "#E4F4F4"][n % 5],
        });
        n++;
      }
    }
  }
  return out;
})();

/**
 * Keep the demo household coherent: the two children shown in the parent app
 * (st-013 and st-076) are siblings, both under guardian g-01.
 */
for (const id of ["st-013", "st-076"]) {
  const student = STUDENTS.find((s) => s.id === id);
  if (student) student.guardianId = "g-01";
}

export const BUSES: Pick<
  Bus,
  "id" | "plate" | "name" | "routeId" | "driverId" | "attendantId" | "capacity"
>[] =
  ROUTE_SEEDS.map((seed) => ({
    id: `b-${seed.code.replace("R-", "")}`,
    plate: seed.plate,
    name: `${seed.code} · ${seed.name.split(" · ")[0]}`,
    routeId: seed.id,
    driverId: seed.driverId,
    attendantId: seed.attendantId,
    capacity: seed.capacity,
  }));

export const ROUTE_PHASES: Record<string, number> = Object.fromEntries(
  ROUTE_SEEDS.map((s) => [s.id, s.phase])
);

/**
 * Scripted incidents so the console has something real to react to.
 * Times are seconds into the run cycle.
 */
export const SCRIPTED_ALERTS: Omit<Alert, "atSec">[] = [
  {
    id: "al-001",
    kind: "breakdown",
    busId: "b-04",
    routeId: "r-04",
    title: "R-04 stopped on Lang'ata Road",
    body: "Engine warning light reported by driver Ali Hassan. Hazards on, 32 students on board. Recovery bus dispatched.",
    severity: "critical",
    acknowledged: false,
  },
  {
    id: "al-002",
    kind: "delay",
    busId: "b-03",
    routeId: "r-03",
    title: "Heavy traffic on Mombasa Road",
    body: "R-03 running behind schedule. Parents on this route notified automatically.",
    severity: "warning",
    acknowledged: true,
  },
  {
    id: "al-003",
    kind: "sos",
    busId: "b-05",
    routeId: "r-05",
    title: "Panic button test cleared",
    body: "Driver Mercy Achieng triggered the SOS test at Jogoo Road. Operations confirmed it was a drill.",
    severity: "info",
    acknowledged: true,
  },
  {
    id: "al-004",
    kind: "geofence",
    busId: "b-01",
    routeId: "r-01",
    title: "R-01 entered school geofence",
    body: "Bus crossed the 300 m school perimeter; gate team notified.",
    severity: "info",
    acknowledged: true,
  },
];

export const emergencyContacts = [
  { label: "School transport desk", value: "+254 20 445 1120", tone: "emerald" },
  { label: "Operations lead", value: "Nadia Karemi · +254 722 004 118", tone: "blue" },
  { label: "Emergency services", value: "999 / 112", tone: "red" },
];
