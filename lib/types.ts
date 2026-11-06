export type LatLng = { lat: number; lng: number };

export type RunStatus =
  | "on_time"
  | "delayed"
  | "breakdown"
  | "finished"
  /** registered with a tracker that has not reported yet */
  | "offline";


export type Stop = {
  id: string;
  name: string;
  area: string;
  coord: LatLng;
  /** seconds from route start that the bus is scheduled to reach this stop */
  offsetSec: number;
  students: number;
};

export type Bus = {
  id: string;
  plate: string;
  name: string;
  routeId: string;
  driverId: string;
  attendantId: string;
  capacity: number;
  onBoard: number;
  status: RunStatus;
  /** seconds behind schedule (negative = ahead) */
  delaySec: number;
  speedKph: number;
  heading: number;
  position: LatLng;
  coord: LatLng;
  lastPingSec: number;
  fuelPct: number;
  odometerKm: number;
  nextStopId: string;
  progress: number;
  direction: "morning" | "afternoon";
  parkState: "none" | "at_stop" | "at_school" | "stopped";
  etaSec: number;
  tripIndex: number;
  /** true when the bus came from the school's own registration form */
  registered?: boolean;
  model?: string;
  trackerId?: string;
  attendantOnDuty?: string;
  offlineReason?: string;
};

export type Driver = {
  id: string;
  name: string;
  phone: string;
  licence: string;
  rating: number;
  yearsExp: number;
  avatarHue: number;
};

export type Attendant = {
  id: string;
  name: string;
  phone: string;
  avatarHue: number;
};

export type Student = {
  id: string;
  name: string;
  grade: string;
  class: string;
  guardianId: string;
  stopId: string;
  routeId: string;
  busId: string;
  boardStatus: "waiting" | "onboard" | "dropped" | "absent";
  avatarHue: number;
  photoTone: string;
};

export type Guardian = {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatarHue: number;
};

export type AlertKind = "delay" | "sos" | "breakdown" | "boarding" | "dropoff" | "eta" | "geofence";

export type Alert = {
  id: string;
  kind: AlertKind;
  busId: string;
  routeId: string;
  title: string;
  body: string;
  atSec: number;
  severity: "info" | "warning" | "critical";
  acknowledged: boolean;
};

export type Route = {
  id: string;
  name: string;
  code: string;
  color: string;
  schoolId: string;
  stops: Stop[];
  path: LatLng[];
  /** total scheduled duration in seconds */
  durationSec: number;
  distanceKm: number;
  direction: "morning" | "afternoon";
};

export type School = {
  id: string;
  name: string;
  shortName: string;
  coord: LatLng;
  city: string;
  term: string;
};

export type TripEvent = {
  id: string;
  atSec: number;
  kind: "board" | "drop" | "depart" | "arrive" | "note" | "alert";
  studentId?: string;
  stopId?: string;
  busId: string;
  text: string;
};

export type Snapshot = {
  serverTimeMs: number;
  simSec: number;
  clockLabel: string;
  school: School;
  routes: Route[];
  buses: Bus[];
  drivers: Driver[];
  attendants: Attendant[];
  students: Student[];
  guardians: Guardian[];
  alerts: Alert[];
  events: TripEvent[];
  /** Where the whole school operation is in the day, so the UI can explain a quiet console. */
  phase: {
    current: "before_service" | "pickup" | "in_session" | "dropoff" | "after_service";
    label: string;
    detail: string;
    nextEvent: string;
  };
  kpis: {
    busesActive: number;
    busesTotal: number;
    studentsOnBoard: number;
    studentsTotal: number;
    onTimePct: number;
    avgDelaySec: number;
    openAlerts: number;
    attendancePct: number;
  };
};
