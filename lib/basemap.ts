import type { LatLng } from "./types";

export type MapLabel = { name: string; at: LatLng; kind: "area" | "park"; size?: "sm" | "md" };

/** Place names drawn faintly over the aerial basemap. */
export const LABELS: MapLabel[] = [
  { name: "Parklands", at: { lat: -1.2632, lng: 36.8252 }, kind: "area" },
  { name: "Westlands", at: { lat: -1.2662, lng: 36.8042 }, kind: "area" },
  { name: "Riverside", at: { lat: -1.2762, lng: 36.7902 }, kind: "area", size: "sm" },
  { name: "Kileleshwa", at: { lat: -1.2822, lng: 36.7732 }, kind: "area" },
  { name: "Kilimani", at: { lat: -1.2902, lng: 36.7872 }, kind: "area" },
  { name: "Nairobi CBD", at: { lat: -1.2862, lng: 36.8222 }, kind: "area" },
  { name: "South B", at: { lat: -1.3052, lng: 36.8302 }, kind: "area" },
  { name: "South C", at: { lat: -1.3132, lng: 36.8352 }, kind: "area", size: "sm" },
  { name: "Lang'ata", at: { lat: -1.3212, lng: 36.7662 }, kind: "area" },
  { name: "Karen", at: { lat: -1.3362, lng: 36.7162 }, kind: "area" },
  { name: "Buruburu", at: { lat: -1.2802, lng: 36.8722 }, kind: "area" },
  { name: "Donholm", at: { lat: -1.2882, lng: 36.8982 }, kind: "area", size: "sm" },
  { name: "Umoja", at: { lat: -1.2762, lng: 36.8922 }, kind: "area", size: "sm" },
  { name: "Makadara", at: { lat: -1.2912, lng: 36.8472 }, kind: "area", size: "sm" },
  { name: "Kibera", at: { lat: -1.2982, lng: 36.7842 }, kind: "area", size: "sm" },
  { name: "Karura Forest", at: { lat: -1.2402, lng: 36.8452 }, kind: "park" },
  { name: "Ngong Road Forest", at: { lat: -1.3142, lng: 36.7562 }, kind: "park" },
  { name: "Nairobi National Park", at: { lat: -1.3622, lng: 36.8422 }, kind: "park" },
  { name: "Nairobi River", at: { lat: -1.2882, lng: 36.8332 }, kind: "park" },
];
