import type { GpsCoords } from "@/lib/gps";

export type RoutePointLike = {
  latitude: number;
  longitude: number;
  recorded_at?: string;
  recordedAt?: string;
  accuracy_m?: number | null;
  accuracyM?: number | null;
};

function toRad(d: number) {
  return (d * Math.PI) / 180;
}

export function haversineMeters(a: GpsCoords, b: GpsCoords): number {
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function distanceBetweenPoints(points: RoutePointLike[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineMeters(
      { latitude: points[i - 1].latitude, longitude: points[i - 1].longitude },
      { latitude: points[i].latitude, longitude: points[i].longitude },
    );
  }
  return Math.round(total * 100) / 100;
}

export type RoutePointCandidate = {
  latitude: number;
  longitude: number;
  recordedAt: string;
  accuracyM?: number | null;
};

export type RouteRecordDecision =
  | { accept: true }
  | { accept: false; reason: "poor_accuracy" | "too_soon" | "gps_noise" | "impossible_speed" };

/**
 * Indoor / desktop GPS often jitters 10–40m while the device is still.
 * Only accept a new breadcrumb when movement exceeds the noise floor AND enough time passed.
 */
export function evaluateRoutePoint(
  last: RoutePointCandidate | null,
  next: RoutePointCandidate,
  options?: {
    minIntervalMs?: number;
    minDistanceM?: number;
    maxAccuracyM?: number;
    maxSpeedMps?: number;
  },
): RouteRecordDecision {
  const minIntervalMs = options?.minIntervalMs ?? 10_000;
  const minDistanceM = options?.minDistanceM ?? 18;
  const maxAccuracyM = options?.maxAccuracyM ?? 80;
  const maxSpeedMps = options?.maxSpeedMps ?? 6;

  const accuracy = next.accuracyM;

  if (!last) {
    if (accuracy != null && accuracy > 150) return { accept: false, reason: "poor_accuracy" };
    return { accept: true };
  }

  if (accuracy != null && accuracy > maxAccuracyM) {
    return { accept: false, reason: "poor_accuracy" };
  }

  const elapsed =
    new Date(next.recordedAt).getTime() - new Date(last.recordedAt).getTime();
  if (elapsed < minIntervalMs) {
    return { accept: false, reason: "too_soon" };
  }

  const dist = haversineMeters(last, next);
  const lastAcc = last.accuracyM ?? 30;
  const nextAcc = accuracy ?? 30;
  const noiseFloor = Math.max(minDistanceM, lastAcc * 0.6, nextAcc * 0.6);

  if (dist < noiseFloor) {
    return { accept: false, reason: "gps_noise" };
  }

  const speed = dist / Math.max(elapsed / 1000, 0.001);
  if (speed > maxSpeedMps) {
    return { accept: false, reason: "impossible_speed" };
  }

  return { accept: true };
}

export function shouldRecordRoutePoint(
  last: RoutePointCandidate | null,
  next: RoutePointCandidate,
  options?: {
    minIntervalMs?: number;
    minDistanceM?: number;
    maxAccuracyM?: number;
  },
): boolean {
  return evaluateRoutePoint(last, next, options).accept;
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function durationSeconds(startedAt: string, endedAt?: string | null): number {
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  return Math.max(0, Math.round((end - new Date(startedAt).getTime()) / 1000));
}
