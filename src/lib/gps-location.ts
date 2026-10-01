import { BEMACK_FARM_ID, BEMACK_FARM_NAME } from "@/lib/bemack-master-data";
import {
  anchorByGreenhouseId,
  syntheticGreenhouseAnchors,
  type GreenhouseAnchor,
} from "@/lib/greenhouse-locations";
import type { GpsCoords } from "@/lib/gps";
import { checkGreenhouseGeofence } from "@/lib/scouting-geofence";

export type GreenhouseLocation = {
  farmId: string;
  farmName: string;
  greenhouseId: string;
  greenhouseName: string;
  lat: number;
  lng: number;
  distanceM: number;
};

function haversineM(a: GpsCoords, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.latitude);
  const dLng = toRad(b.lng - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function distanceToLocation(
  coords: GpsCoords,
  loc: { lat: number; lng: number },
) {
  return Math.round(haversineM(coords, loc));
}

export type FindNearestGreenhouseOptions = {
  /** Keep current house when still inside its geofence (avoids neighbor bleed on row ends). */
  preferGreenhouseId?: string | null;
};

/** Nearest Star greenhouse from live GPS (geofence-style, no QR). */
export function findNearestGreenhouse(
  coords: GpsCoords,
  locations: GreenhouseAnchor[] = syntheticGreenhouseAnchors(),
  options?: FindNearestGreenhouseOptions,
): GreenhouseLocation {
  const preferId = options?.preferGreenhouseId;
  if (preferId) {
    const fence = checkGreenhouseGeofence(coords, preferId, locations);
    const preferred = anchorByGreenhouseId(preferId, locations);
    if (preferred && fence?.inside && !fence.anchorMismatch) {
      return {
        farmId: preferred.farmId,
        farmName: preferred.farmName,
        greenhouseId: preferred.greenhouseId,
        greenhouseName: preferred.greenhouseName,
        lat: preferred.lat,
        lng: preferred.lng,
        distanceM: fence.distanceM,
      };
    }
  }

  let best = locations[0];
  let bestD = Infinity;

  for (const loc of locations) {
    const d = haversineM(coords, { lat: loc.lat, lng: loc.lng });
    if (d < bestD) {
      bestD = d;
      best = loc;
    }
  }

  return {
    farmId: best.farmId,
    farmName: best.farmName,
    greenhouseId: best.greenhouseId,
    greenhouseName: best.greenhouseName,
    lat: best.lat,
    lng: best.lng,
    distanceM: Math.round(bestD),
  };
}

export function defaultFarmContext() {
  const loc = syntheticGreenhouseAnchors()[0];
  return {
    farmId: BEMACK_FARM_ID,
    farmName: BEMACK_FARM_NAME,
    greenhouseId: loc.greenhouseId,
    greenhouseName: loc.greenhouseName,
  };
}
