import { BEMACK_DEMO_LOCATIONS } from "@/lib/bemack-master-data";
import type { GpsCoords } from "@/lib/gps";
import { haversineMeters } from "@/lib/route-metrics";

/** Soft geofence radius around greenhouse anchor (meters). */
export const GREENHOUSE_GEOFENCE_M = 250;

/**
 * Distances beyond this mean the assigned greenhouse anchor is not the real
 * farm location (e.g. demo Nairobi anchors vs Naivasha GPS) — warn differently,
 * do not treat as "left the greenhouse."
 */
export const GEOFENCE_ANCHOR_MISMATCH_M = 5_000;

export type GeofenceStatus = {
  inside: boolean;
  /** True when GPS is so far from demo/DB anchors that the fence is unreliable */
  anchorMismatch: boolean;
  distanceM: number;
  greenhouseName: string;
  greenhouseId: string;
};

export function checkGreenhouseGeofence(
  coords: GpsCoords,
  greenhouseId: string | null | undefined,
): GeofenceStatus | null {
  if (!greenhouseId) return null;
  const loc = BEMACK_DEMO_LOCATIONS.find((l) => l.greenhouseId === greenhouseId);
  if (!loc) return null;
  const distanceM = Math.round(
    haversineMeters(coords, { latitude: loc.lat, longitude: loc.lng }),
  );
  const anchorMismatch = distanceM > GEOFENCE_ANCHOR_MISMATCH_M;
  return {
    inside: anchorMismatch ? true : distanceM <= GREENHOUSE_GEOFENCE_M,
    anchorMismatch,
    distanceM,
    greenhouseName: loc.greenhouseName,
    greenhouseId: loc.greenhouseId,
  };
}
