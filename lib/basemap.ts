import type { LatLng } from "./types";

export type MapPolygon = { name: string; kind: "park" | "forest" | "water"; ring: LatLng[] };
export type MapRoad = { name: string; class: "primary" | "secondary"; path: LatLng[] };
export type MapLabel = { name: string; at: LatLng; kind: "area" | "park"; size?: "sm" | "md" };

const p = (lat: number, lng: number): LatLng => ({ lat, lng });

export const PARKS: MapPolygon[] = [
  {
    name: "Karura Forest",
    kind: "forest",
    ring: [
      p(-1.2285, 36.8325), p(-1.2337, 36.8521), p(-1.2432, 36.8618), p(-1.2528, 36.8552),
      p(-1.2519, 36.8389), p(-1.2418, 36.8281),
    ],
  },
  {
    name: "City Park",
    kind: "park",
    ring: [p(-1.2562, 36.8172), p(-1.2581, 36.8256), p(-1.2628, 36.8251), p(-1.2621, 36.8168)],
  },
  {
    name: "Uhuru Park",
    kind: "park",
    ring: [p(-1.2848, 36.8125), p(-1.2856, 36.8224), p(-1.2929, 36.8219), p(-1.2931, 36.8119)],
  },
  {
    name: "Ngong Road Forest",
    kind: "forest",
    ring: [
      p(-1.3021, 36.7412), p(-1.3088, 36.7668), p(-1.3208, 36.7751), p(-1.3262, 36.7532),
      p(-1.3158, 36.7388),
    ],
  },
  {
    name: "Nairobi National Park",
    kind: "park",
    ring: [
      p(-1.3382, 36.8082), p(-1.3398, 36.8871), p(-1.3802, 36.9121), p(-1.4020, 36.8502),
      p(-1.3842, 36.7951),
    ],
  },
  {
    name: "Nairobi Arboretum",
    kind: "park",
    ring: [p(-1.2851, 36.7901), p(-1.2862, 36.7972), p(-1.2912, 36.7961), p(-1.2902, 36.7891)],
  },
  {
    name: "Nairobi Dam",
    kind: "water",
    ring: [p(-1.3001, 36.7852), p(-1.3058, 36.7962), p(-1.3102, 36.7932), p(-1.3048, 36.7822)],
  },
];

export const ROADS: MapRoad[] = [
  {
    name: "Waiyaki Way",
    class: "primary",
    path: [p(-1.2642, 36.8058), p(-1.2602, 36.7932), p(-1.2568, 36.7781), p(-1.2521, 36.7612), p(-1.2488, 36.7441)],
  },
  {
    name: "Uhuru Highway",
    class: "primary",
    path: [p(-1.2898, 36.8172), p(-1.2882, 36.8088), p(-1.2831, 36.7992), p(-1.2762, 36.7942), p(-1.2701, 36.7918)],
  },
  {
    name: "Mombasa Road",
    class: "primary",
    path: [p(-1.2921, 36.8202), p(-1.2982, 36.8312), p(-1.3041, 36.8451), p(-1.3122, 36.8661), p(-1.3202, 36.8891)],
  },
  {
    name: "Thika Road",
    class: "primary",
    path: [p(-1.2862, 36.8241), p(-1.2802, 36.8388), p(-1.2721, 36.8562), p(-1.2642, 36.8781)],
  },
  {
    name: "Jogoo Road",
    class: "primary",
    path: [p(-1.2851, 36.8262), p(-1.2872, 36.8452), p(-1.2891, 36.8621), p(-1.2912, 36.8842)],
  },
  {
    name: "Ngong Road",
    class: "primary",
    path: [p(-1.2942, 36.8112), p(-1.2981, 36.7951), p(-1.3042, 36.7762), p(-1.3122, 36.7562), p(-1.3188, 36.7382)],
  },
  {
    name: "Lang'ata Road",
    class: "primary",
    path: [p(-1.3002, 36.8151), p(-1.3081, 36.7942), p(-1.3182, 36.7702), p(-1.3298, 36.7392), p(-1.3391, 36.7112)],
  },
  {
    name: "Kiambu Road",
    class: "secondary",
    path: [p(-1.2762, 36.8191), p(-1.2652, 36.8262), p(-1.2521, 36.8312), p(-1.2382, 36.8362)],
  },
  {
    name: "Limuru Road",
    class: "secondary",
    path: [p(-1.2672, 36.8102), p(-1.2588, 36.7991), p(-1.2452, 36.7892), p(-1.2321, 36.7812)],
  },
  {
    name: "Ring Road Kilimani",
    class: "secondary",
    path: [p(-1.2901, 36.7842), p(-1.2832, 36.7762), p(-1.2788, 36.7812), p(-1.2742, 36.7872)],
  },
  {
    name: "Parklands Road",
    class: "secondary",
    path: [p(-1.2602, 36.8322), p(-1.2621, 36.8202), p(-1.2612, 36.8072), p(-1.2642, 36.7962)],
  },
  {
    name: "Juja Road",
    class: "secondary",
    path: [p(-1.2742, 36.8312), p(-1.2762, 36.8512), p(-1.2788, 36.8721), p(-1.2802, 36.8942)],
  },
  {
    name: "Outer Ring Road",
    class: "secondary",
    path: [p(-1.2802, 36.8902), p(-1.2842, 36.9082), p(-1.2962, 36.9182)],
  },
  {
    name: "South B / South C Link",
    class: "secondary",
    path: [p(-1.3122, 36.8322), p(-1.3052, 36.8282), p(-1.2982, 36.8202)],
  },
  {
    name: "Riverside Drive",
    class: "secondary",
    path: [p(-1.2712, 36.7982), p(-1.2742, 36.7902), p(-1.2762, 36.7842), p(-1.2802, 36.7802)],
  },
  {
    name: "Kileleshwa Ring",
    class: "secondary",
    path: [p(-1.2782, 36.7702), p(-1.2822, 36.7772), p(-1.2882, 36.7812)],
  },
  {
    name: "Bogani Road",
    class: "secondary",
    path: [p(-1.3282, 36.7262), p(-1.3342, 36.7162), p(-1.3402, 36.7082)],
  },
];

export const RIVER: LatLng[] = [
  p(-1.2482, 36.7882), p(-1.2602, 36.7962), p(-1.2702, 36.8042), p(-1.2792, 36.8102),
  p(-1.2842, 36.8182), p(-1.2882, 36.8282), p(-1.2902, 36.8402), p(-1.2921, 36.8552),
  p(-1.2942, 36.8721), p(-1.2962, 36.8882),
];

export const LABELS: MapLabel[] = [
  { name: "Parklands", at: p(-1.2632, 36.8252), kind: "area" },
  { name: "Westlands", at: p(-1.2662, 36.8042), kind: "area" },
  { name: "Riverside", at: p(-1.2762, 36.7902), kind: "area", size: "sm" },
  { name: "Kileleshwa", at: p(-1.2822, 36.7732), kind: "area" },
  { name: "Kilimani", at: p(-1.2902, 36.7872), kind: "area" },
  { name: "Nairobi CBD", at: p(-1.2862, 36.8222), kind: "area" },
  { name: "South B", at: p(-1.3052, 36.8302), kind: "area" },
  { name: "South C", at: p(-1.3132, 36.8352), kind: "area", size: "sm" },
  { name: "Lang'ata", at: p(-1.3212, 36.7662), kind: "area" },
  { name: "Karen", at: p(-1.3362, 36.7162), kind: "area" },
  { name: "Buruburu", at: p(-1.2802, 36.8722), kind: "area" },
  { name: "Donholm", at: p(-1.2882, 36.8982), kind: "area", size: "sm" },
  { name: "Umoja", at: p(-1.2762, 36.8922), kind: "area", size: "sm" },
  { name: "Makadara", at: p(-1.2912, 36.8472), kind: "area", size: "sm" },
  { name: "Kibera", at: p(-1.2982, 36.7842), kind: "area", size: "sm" },
  { name: "Karura Forest", at: p(-1.2402, 36.8452), kind: "park" },
  { name: "Ngong Road Forest", at: p(-1.3142, 36.7562), kind: "park" },
  { name: "Nairobi National Park", at: p(-1.3622, 36.8422), kind: "park" },
  { name: "Nairobi River", at: p(-1.2882, 36.8332), kind: "park" },
];
