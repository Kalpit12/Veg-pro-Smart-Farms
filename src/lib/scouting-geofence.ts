import {
  anchorByGreenhouseId,
  syntheticGreenhouseAnchors,
  type GreenhouseAnchor,
} from "@/lib/greenhouse-locations";
import type { GpsCoords } from "@/lib/gps";
import { haversineMeters } from "@/lib/route-metrics";

/** Soft geofence radius around greenhouse anchor (meters). */
export const GREENHOUSE_GEOFENCE_M = 250;

/**
 * Distances beyond this mean the assigned greenhouse anchor is not near the
 * phone GPS — warn as unreliable fence (wrong farm base / missing survey).
 */
export const GEOFENCE_ANCHOR_MISMATCH_M = 5_000;

export type GeofenceStatus = {
  inside: boolean;
  /** True when GPS is so far from anchors that the fence is unreliable */
  anchorMismatch: boolean;
  distanceM: number;
  greenhouseName: string;
  greenhouseId: string;
};

export function checkGreenhouseGeofence(
  coords: GpsCoords,
  greenhouseId: string | null | undefined,
  locations: GreenhouseAnchor[] = syntheticGreenhouseAnchors(),
): GeofenceStatus | null {
  if (!greenhouseId) return null;
  const loc = anchorByGreenhouseId(greenhouseId, locations);
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
