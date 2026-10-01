import { cellGpsInGreenhouse } from "@/lib/cell-gps";
import {
  georefCellGps,
  resolveGreenhouseGeoref,
  resolveGreenhouseMapAnchor,
  type GreenhouseGeoref,
  type LatLng,
} from "@/lib/greenhouse-grid-georef";
import { haversineMeters } from "@/lib/route-metrics";
import type { ScoutRouteStop } from "@/lib/scout-route";

export type { LatLng } from "@/lib/greenhouse-grid-georef";

export type TrackPointLike = LatLng & { recordedAt?: string };

export type AlignedStop = {
  id: string;
  /** Position shown on the map (on the walk path when possible). */
  displayLat: number;
  displayLng: number;
  /** Raw GPS from the scouting record, if different. */
  rawLat: number | null;
  rawLng: number | null;
  offsetM: number;
  snappedToTrack: boolean;
};

function projectOnSegment(
  p: LatLng,
  a: LatLng,
  b: LatLng,
): { point: LatLng; distanceM: number } {
  const ax = a.lng;
  const ay = a.lat;
  const bx = b.lng;
  const by = b.lat;
  const px = p.lng;
  const py = p.lat;
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return {
      point: a,
      distanceM: haversineMeters(
        { latitude: p.lat, longitude: p.lng },
        { latitude: a.lat, longitude: a.lng },
      ),
    };
  }
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const point = { lat: ay + t * dy, lng: ax + t * dx };
  return {
    point,
    distanceM: haversineMeters(
      { latitude: p.lat, longitude: p.lng },
      { latitude: point.lat, longitude: point.lng },
    ),
  };
}

/** Closest point on a polyline to `p` (meters). */
export function nearestPointOnPolyline(
  p: LatLng,
  line: LatLng[],
): { point: LatLng; distanceM: number } | null {
  if (line.length === 0) return null;
  if (line.length === 1) {
    return {
      point: line[0],
      distanceM: haversineMeters(
        { latitude: p.lat, longitude: p.lng },
        { latitude: line[0].lat, longitude: line[0].lng },
      ),
    };
  }
  let best = projectOnSegment(p, line[0], line[1]);
  for (let i = 1; i < line.length - 1; i++) {
    const cand = projectOnSegment(p, line[i], line[i + 1]);
    if (cand.distanceM < best.distanceM) best = cand;
  }
  return best;
}

function nearestTrackByTime(
  track: TrackPointLike[],
  recordedAt: string,
  maxWindowMs = 4 * 60_000,
): TrackPointLike | null {
  if (!track.length) return null;
  const t = new Date(recordedAt).getTime();
  let best: TrackPointLike | null = null;
  let bestDt = Infinity;
  for (const p of track) {
    if (!p.recordedAt) continue;
    const dt = Math.abs(new Date(p.recordedAt).getTime() - t);
    if (dt < bestDt) {
      bestDt = dt;
      best = p;
    }
  }
  if (!best || bestDt > maxWindowMs) return null;
  return best;
}

/** Light smoothing for display (Scarab-style clean path, not raw jitter). */
export function smoothTrackForDisplay(
  track: TrackPointLike[],
  window = 3,
): LatLng[] {
  if (track.length <= 2) return track.map((p) => ({ lat: p.lat, lng: p.lng }));
  const out: LatLng[] = [];
  for (let i = 0; i < track.length; i++) {
    const from = Math.max(0, i - Math.floor(window / 2));
    const to = Math.min(track.length - 1, i + Math.floor(window / 2));
    let lat = 0;
    let lng = 0;
    let n = 0;
    for (let j = from; j <= to; j++) {
      lat += track[j].lat;
      lng += track[j].lng;
      n += 1;
    }
    out.push({ lat: lat / n, lng: lng / n });
  }
  return out;
}

export function alignStopsToTrack(
  stops: {
    id: string;
    lat: number | null;
    lng: number | null;
    recordedAt: string;
  }[],
  track: TrackPointLike[],
  options?: { maxSnapM?: number },
): AlignedStop[] {
  const maxSnapM = options?.maxSnapM ?? 90;
  const line = smoothTrackForDisplay(track);

  return stops.map((stop) => {
    if (stop.lat == null || stop.lng == null) {
      return {
        id: stop.id,
        displayLat: 0,
        displayLng: 0,
        rawLat: null,
        rawLng: null,
        offsetM: 0,
        snappedToTrack: false,
      };
    }

    const raw = { lat: stop.lat, lng: stop.lng };

    if (line.length >= 2) {
      const byTime = nearestTrackByTime(track, stop.recordedAt);
      if (byTime) {
        const offsetM = haversineMeters(
          { latitude: raw.lat, longitude: raw.lng },
          { latitude: byTime.lat, longitude: byTime.lng },
        );
        if (offsetM <= maxSnapM) {
          return {
            id: stop.id,
            displayLat: byTime.lat,
            displayLng: byTime.lng,
            rawLat: stop.lat,
            rawLng: stop.lng,
            offsetM,
            snappedToTrack: true,
          };
        }
      }

      const onLine = nearestPointOnPolyline(raw, line);
      if (onLine && onLine.distanceM <= maxSnapM) {
        return {
          id: stop.id,
          displayLat: onLine.point.lat,
          displayLng: onLine.point.lng,
          rawLat: stop.lat,
          rawLng: stop.lng,
          offsetM: onLine.distanceM,
          snappedToTrack: true,
        };
      }
    }

    return {
      id: stop.id,
      displayLat: stop.lat,
      displayLng: stop.lng,
      rawLat: stop.lat,
      rawLng: stop.lng,
      offsetM: 0,
      snappedToTrack: false,
    };
  });
}

/** Prefer the latest walk breadcrumb when saving a stop (keeps pins on the blue path). */
export function isValidMapCoord(lat: number, lng: number) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(Math.abs(lat) < 1e-6 && Math.abs(lng) < 1e-6)
  );
}

/** True when most breadcrumbs are within range of the greenhouse anchor. */
export function trackMatchesGreenhouse(
  track: TrackPointLike[],
  greenhouseName: string,
  maxDistanceM = 200,
  mapAnchor?: LatLng | null,
): boolean {
  if (!track.length || !greenhouseName) return false;
  const loc = resolveGreenhouseMapAnchor(greenhouseName, mapAnchor);
  if (!loc) return false;
  const anchor = { latitude: loc.lat, longitude: loc.lng };
  const near = track.filter(
    (p) =>
      isValidMapCoord(p.lat, p.lng) &&
      haversineMeters(anchor, { latitude: p.lat, longitude: p.lng }) <= maxDistanceM,
  );
  if (near.length >= Math.max(2, Math.ceil(track.length * 0.5))) return true;

  const valid = track.filter((p) => isValidMapCoord(p.lat, p.lng));
  if (valid.length < 2) return false;
  const cx = valid.reduce((s, p) => s + p.lat, 0) / valid.length;
  const cy = valid.reduce((s, p) => s + p.lng, 0) / valid.length;
  const span = valid.filter(
    (p) => haversineMeters({ latitude: cx, longitude: cy }, { latitude: p.lat, longitude: p.lng }) <= 120,
  );
  return span.length >= Math.max(2, Math.ceil(valid.length * 0.45));
}

export function filterTrackNearGreenhouse(
  track: TrackPointLike[],
  greenhouseName: string,
  maxDistanceM = 250,
  mapAnchor?: LatLng | null,
): TrackPointLike[] {
  const loc = resolveGreenhouseMapAnchor(greenhouseName, mapAnchor);
  if (!loc) return track.filter((p) => isValidMapCoord(p.lat, p.lng));
  const anchor = { latitude: loc.lat, longitude: loc.lng };
  const filtered = track.filter(
    (p) =>
      isValidMapCoord(p.lat, p.lng) &&
      haversineMeters(anchor, { latitude: p.lat, longitude: p.lng }) <= maxDistanceM,
  );
  if (filtered.length >= 2) return filtered;

  const valid = track.filter((p) => isValidMapCoord(p.lat, p.lng));
  if (valid.length < 2) return valid;
  const cx = valid.reduce((s, p) => s + p.lat, 0) / valid.length;
  const cy = valid.reduce((s, p) => s + p.lng, 0) / valid.length;
  const clustered = valid.filter(
    (p) =>
      haversineMeters({ latitude: cx, longitude: cy }, { latitude: p.lat, longitude: p.lng }) <= 150,
  );
  return clustered.length >= 2 ? clustered : valid;
}

export type StopMapPosition = {
  lat: number;
  lng: number;
  source: "cell" | "track" | "raw";
  rawLat: number | null;
  rawLng: number | null;
  offsetM: number;
};

export function greenhouseGeorefForStops(
  stops: ScoutRouteStop[],
  track: TrackPointLike[],
  greenhouseName: string,
  mapAnchor?: LatLng | null,
): GreenhouseGeoref | null {
  return resolveGreenhouseGeoref(stops, track, greenhouseName, mapAnchor);
}

/** Pin each stop on the greenhouse grid (matches heat map) with optional GPS track snap. */
export function resolveStopMapPositions(
  stops: ScoutRouteStop[],
  track: TrackPointLike[],
  greenhouseName: string,
  georef?: GreenhouseGeoref | null,
  mapAnchor?: LatLng | null,
): Map<string, StopMapPosition> {
  const gridFit =
    georef ?? resolveGreenhouseGeoref(stops, track, greenhouseName, mapAnchor);
  const useTrack = trackMatchesGreenhouse(track, greenhouseName, 200, mapAnchor);
  const filteredTrack = useTrack
    ? filterTrackNearGreenhouse(track, greenhouseName, 250, mapAnchor)
    : [];
  const aligned = useTrack
    ? alignStopsToTrack(
        stops.map((s) => ({
          id: s.id,
          lat: s.lat,
          lng: s.lng,
          recordedAt: s.recordedAt,
        })),
        filteredTrack,
      )
    : [];

  const alignedMap = new Map(aligned.map((a) => [a.id, a]));
  const out = new Map<string, StopMapPosition>();

  for (const stop of stops) {
    const cellLl =
      stop.columnNo > 0 && stop.bayNo > 0
        ? georefCellGps(greenhouseName, stop.columnNo, stop.bayNo, gridFit, mapAnchor)
        : null;
    const cell =
      cellLl && isValidMapCoord(cellLl.lat, cellLl.lng)
        ? { latitude: cellLl.lat, longitude: cellLl.lng }
        : stop.columnNo > 0 && stop.bayNo > 0
          ? cellGpsInGreenhouse(greenhouseName, stop.columnNo, stop.bayNo)
          : null;

    if (cell && isValidMapCoord(cell.latitude, cell.longitude)) {
      const rawLat = stop.lat;
      const rawLng = stop.lng;
      const offsetM =
        rawLat != null && rawLng != null
          ? haversineMeters(
              { latitude: rawLat, longitude: rawLng },
              { latitude: cell.latitude, longitude: cell.longitude },
            )
          : 0;
      out.set(stop.id, {
        lat: cell.latitude,
        lng: cell.longitude,
        source: "cell",
        rawLat,
        rawLng,
        offsetM,
      });
      continue;
    }

    const a = alignedMap.get(stop.id);
    if (a && isValidMapCoord(a.displayLat, a.displayLng)) {
      out.set(stop.id, {
        lat: a.displayLat,
        lng: a.displayLng,
        source: "track",
        rawLat: a.rawLat,
        rawLng: a.rawLng,
        offsetM: a.offsetM,
      });
      continue;
    }

    if (stop.lat != null && stop.lng != null && isValidMapCoord(stop.lat, stop.lng)) {
      out.set(stop.id, {
        lat: stop.lat,
        lng: stop.lng,
        source: "raw",
        rawLat: stop.lat,
        rawLng: stop.lng,
        offsetM: 0,
      });
    }
  }

  // Fan out multiple observations in the same bay×column cell.
  const byCell = new Map<string, string[]>();
  for (const stop of stops) {
    if (!out.has(stop.id)) continue;
    const key = `${stop.columnNo}-${stop.bayNo}`;
    const ids = byCell.get(key) ?? [];
    ids.push(stop.id);
    byCell.set(key, ids);
  }
  for (const ids of byCell.values()) {
    if (ids.length < 2) continue;
    const base = out.get(ids[0])!;
    const radiusM = 1.8;
    for (let i = 0; i < ids.length; i++) {
      const angle = (2 * Math.PI * i) / ids.length;
      const east = Math.cos(angle) * radiusM;
      const north = Math.sin(angle) * radiusM;
      const latRad = (base.lat * Math.PI) / 180;
      const lat = base.lat + north / 111_320;
      const lng = base.lng + east / (111_320 * Math.cos(latRad));
      const prev = out.get(ids[i])!;
      out.set(ids[i], { ...prev, lat, lng });
    }
  }

  return out;
}

export function greenhouseMapCenter(
  greenhouseName: string,
  mapAnchor?: LatLng | null,
): LatLng | null {
  return resolveGreenhouseMapAnchor(greenhouseName, mapAnchor);
}

export function coordsSnappedToWalkPath(
  live: { latitude: number; longitude: number },
  breadcrumbs: { latitude: number; longitude: number; recordedAt: string }[],
  maxAgeMs = 3 * 60_000,
  maxOffsetM = 55,
): { latitude: number; longitude: number } {
  if (!breadcrumbs.length) return live;
  const latest = breadcrumbs[breadcrumbs.length - 1];
  const age = Date.now() - new Date(latest.recordedAt).getTime();
  if (age > maxAgeMs) return live;
  const offset = haversineMeters(live, latest);
  if (offset > maxOffsetM) return live;
  return { latitude: latest.latitude, longitude: latest.longitude };
}
