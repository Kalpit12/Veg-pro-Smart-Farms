import { BEMACK_DEMO_LOCATIONS, BEMACK_FARM_ID, BEMACK_FARM_NAME } from "@/lib/bemack-master-data";
import type { GpsCoords } from "@/lib/gps";

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

/** Nearest Star greenhouse from live GPS (geofence-style, no QR). */
export function findNearestGreenhouse(
  coords: GpsCoords,
  locations = BEMACK_DEMO_LOCATIONS,
): GreenhouseLocation {
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
  const loc = BEMACK_DEMO_LOCATIONS[0];
  return {
    farmId: BEMACK_FARM_ID,
    farmName: BEMACK_FARM_NAME,
    greenhouseId: loc.greenhouseId,
    greenhouseName: loc.greenhouseName,
  };
}
