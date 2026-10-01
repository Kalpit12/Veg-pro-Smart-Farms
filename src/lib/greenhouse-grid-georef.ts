import {
  bayMaxForGreenhouse,
  bemackLocationByName,
  maxColumnsForGreenhouse,
  starGreenhouseRow,
} from "@/lib/bemack-master-data";
import { haversineMeters } from "@/lib/route-metrics";
import type { ScoutRouteStop } from "@/lib/scout-route";
type TrackPointLike = { lat: number; lng: number; recordedAt?: string };

const METERS_PER_DEG_LAT = 111_320;

export type LatLng = { lat: number; lng: number };

export type GreenhouseGeorefKind = "gps-fit" | "track-footprint" | "anchor";

export type GreenhouseGeoref = {
  /** Predict cell center in WGS84 from bay/column (Scarab-style adjusted coords). */
  toGps: (column: number, bay: number) => LatLng;
  medianResidualM: number;
  sampleCount: number;
  kind: GreenhouseGeorefKind;
};

export function resolveGreenhouseMapAnchor(
  greenhouseName: string,
  override?: LatLng | null,
): LatLng | null {
  if (override && Number.isFinite(override.lat) && Number.isFinite(override.lng)) {
    return override;
  }
  const loc = bemackLocationByName(greenhouseName);
  return loc ? { lat: loc.lat, lng: loc.lng } : null;
}

function latLngToEnu(
  lat: number,
  lng: number,
  ref: LatLng,
): { east: number; north: number } {
  const latRad = (ref.lat * Math.PI) / 180;
  const north = (lat - ref.lat) * METERS_PER_DEG_LAT;
  const east = (lng - ref.lng) * METERS_PER_DEG_LAT * Math.cos(latRad);
  return { east, north };
}

function enuToLatLng(east: number, north: number, ref: LatLng): LatLng {
  const latRad = (ref.lat * Math.PI) / 180;
  return {
    lat: ref.lat + north / METERS_PER_DEG_LAT,
    lng: ref.lng + east / (METERS_PER_DEG_LAT * Math.cos(latRad)),
  };
}

/** Footprint size from Star area + bay/column counts (meters). */
export function greenhouseFootprintMeters(greenhouseName: string) {
  const row = starGreenhouseRow(greenhouseName);
  const bayMax = Math.max(1, row.bayMax);
  const colMax = Math.max(1, row.columnMax);
  const area = Math.max(400, row.areaSqm);
  const aspect = colMax / bayMax;
  const lengthM = Math.sqrt(area / aspect);
  const widthM = lengthM * aspect;
  return { widthM, lengthM, bayMax, colMax };
}

/** Uncalibrated grid from anchor (columns → width, bays → length). */
export function cellGpsFromFootprint(
  greenhouseName: string,
  column: number,
  bay: number,
  anchor?: LatLng | null,
): LatLng | null {
  const ref = resolveGreenhouseMapAnchor(greenhouseName, anchor);
  if (!ref) return null;
  const { widthM, lengthM, bayMax, colMax } = greenhouseFootprintMeters(greenhouseName);
  const east = ((column - 0.5) / colMax) * widthM;
  const north = ((bay - 0.5) / bayMax) * lengthM;
  return enuToLatLng(east, north, ref);
}

/** Rotate footprint to match walked path (when GPS stop fit is unavailable). */
export function trackAlignedFootprintGeoref(
  greenhouseName: string,
  track: LatLng[],
  anchor: LatLng,
): GreenhouseGeoref | null {
  const valid = track.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (valid.length < 4) return null;

  const { widthM, lengthM, bayMax, colMax } = greenhouseFootprintMeters(greenhouseName);
  const enu = valid.map((p) => latLngToEnu(p.lat, p.lng, anchor));
  let cx = 0;
  let cy = 0;
  for (const p of enu) {
    cx += p.east;
    cy += p.north;
  }
  cx /= enu.length;
  cy /= enu.length;

  let cxx = 0;
  let cyy = 0;
  let cxy = 0;
  for (const p of enu) {
    const ex = p.east - cx;
    const ny = p.north - cy;
    cxx += ex * ex;
    cyy += ny * ny;
    cxy += ex * ny;
  }
  const angle = 0.5 * Math.atan2(2 * cxy, cxx - cyy);
  const colE = Math.cos(angle);
  const colN = Math.sin(angle);
  const bayE = -Math.sin(angle);
  const bayN = Math.cos(angle);
  const swE = cx - 0.5 * widthM * colE - 0.5 * lengthM * bayE;
  const swN = cy - 0.5 * widthM * colN - 0.5 * lengthM * bayN;

  return {
    kind: "track-footprint",
    sampleCount: valid.length,
    medianResidualM: 0,
    toGps(column: number, bay: number) {
      const fc = (column - 0.5) / colMax;
      const fb = (bay - 0.5) / bayMax;
      const east = swE + fc * widthM * colE + fb * lengthM * bayE;
      const north = swN + fc * widthM * colN + fb * lengthM * bayN;
      return enuToLatLng(east, north, anchor);
    },
  };
}

type Sample = { col: number; bay: number; east: number; north: number };

/** 3-parameter plane: v = b0 + b1*col + b2*bay */
function fitPlane(samples: Sample[], axis: "east" | "north") {
  if (samples.length < 2) return null;

  let s00 = 0;
  let s01 = 0;
  let s02 = 0;
  let s11 = 0;
  let s12 = 0;
  let s22 = 0;
  let y0 = 0;
  let y1 = 0;
  let y2 = 0;

  for (const s of samples) {
    const c = s.col;
    const b = s.bay;
    const y = s[axis];
    s00 += 1;
    s01 += c;
    s02 += b;
    s11 += c * c;
    s12 += c * b;
    s22 += b * b;
    y0 += y;
    y1 += c * y;
    y2 += b * y;
  }

  const det =
    s00 * (s11 * s22 - s12 * s12) -
    s01 * (s01 * s22 - s12 * s02) +
    s02 * (s01 * s12 - s11 * s02);
  if (Math.abs(det) < 1e-8) return null;

  const b0 =
    (y0 * (s11 * s22 - s12 * s12) -
      y1 * (s01 * s22 - s12 * s02) +
      y2 * (s01 * s12 - s11 * s02)) /
    det;
  const b1 =
    (s00 * (y1 * s22 - y2 * s12) -
      y0 * (s01 * s22 - s12 * s02) +
      y2 * (s01 * s02 - s00 * s12)) /
    det;
  const b2 =
    (s00 * (s11 * y2 - y1 * s12) -
      s01 * (s01 * y2 - y1 * s02) +
      y0 * (s01 * s12 - s11 * s02)) /
    det;

  return { b0, b1, b2 };
}

function predict(plane: { b0: number; b1: number; b2: number }, col: number, bay: number) {
  return plane.b0 + plane.b1 * col + plane.b2 * bay;
}

/**
 * Scarab-style: robust linear adjustment of bay/column → GPS using field fixes.
 * @see Riis & Grum (useR 2006) — robust models adjust coordinates and remove outliers.
 */
export function fitGreenhouseGeoref(
  stops: Pick<ScoutRouteStop, "columnNo" | "bayNo" | "lat" | "lng">[],
  greenhouseName: string,
  anchorOverride?: LatLng | null,
): GreenhouseGeoref | null {
  const ref = resolveGreenhouseMapAnchor(greenhouseName, anchorOverride);
  if (!ref) return null;
  const raw: Sample[] = [];
  for (const s of stops) {
    if (s.lat == null || s.lng == null || s.columnNo < 1 || s.bayNo < 1) continue;
    const enu = latLngToEnu(s.lat, s.lng, ref);
    raw.push({ col: s.columnNo, bay: s.bayNo, east: enu.east, north: enu.north });
  }
  if (raw.length < 3) return null;

  let samples = raw;
  for (let iter = 0; iter < 2; iter++) {
    const eastPlane = fitPlane(samples, "east");
    const northPlane = fitPlane(samples, "north");
    if (!eastPlane || !northPlane) return null;

    const kept: Sample[] = [];
    for (const s of samples) {
      const e = predict(eastPlane, s.col, s.bay);
      const n = predict(northPlane, s.col, s.bay);
      const err = Math.hypot(e - s.east, n - s.north);
      if (err <= 45) kept.push(s);
    }
    if (kept.length < 3) break;
    samples = kept;
  }

  const eastPlane = fitPlane(samples, "east");
  const northPlane = fitPlane(samples, "north");
  if (!eastPlane || !northPlane) return null;

  const residuals: number[] = [];
  for (const s of samples) {
    const e = predict(eastPlane, s.col, s.bay);
    const n = predict(northPlane, s.col, s.bay);
    residuals.push(Math.hypot(e - s.east, n - s.north));
  }
  residuals.sort((a, b) => a - b);
  const medianResidualM = residuals[Math.floor(residuals.length / 2)] ?? 99;
  if (medianResidualM > 65) return null;

  return {
    kind: "gps-fit",
    toGps(column: number, bay: number) {
      const east = predict(eastPlane, column, bay);
      const north = predict(northPlane, column, bay);
      return enuToLatLng(east, north, ref);
    },
    medianResidualM,
    sampleCount: samples.length,
  };
}

/** Best available grid: GPS stop regression, then walk-track alignment, then anchor footprint. */
export function resolveGreenhouseGeoref(
  stops: Pick<ScoutRouteStop, "columnNo" | "bayNo" | "lat" | "lng">[],
  track: TrackPointLike[],
  greenhouseName: string,
  anchorOverride?: LatLng | null,
): GreenhouseGeoref | null {
  const ref = resolveGreenhouseMapAnchor(greenhouseName, anchorOverride);
  if (!ref) return null;

  const gpsFit = fitGreenhouseGeoref(stops, greenhouseName, ref);
  if (gpsFit) return gpsFit;

  const trackPts = track
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    .map((p) => ({ lat: p.lat, lng: p.lng }));
  const trackFit = trackAlignedFootprintGeoref(greenhouseName, trackPts, ref);
  if (trackFit) return trackFit;

  return null;
}

/** House outline + interior grid lines in WGS84. */
export function greenhouseMapGridLines(
  greenhouseName: string,
  georef: GreenhouseGeoref | null,
  anchor?: LatLng | null,
): { outline: LatLng[]; columnLines: LatLng[][]; bayLines: LatLng[][] } {
  const bayMax = bayMaxForGreenhouse(greenhouseName);
  const colMax = maxColumnsForGreenhouse(greenhouseName);
  const point = (col: number, bay: number) =>
    georef
      ? georef.toGps(col, bay)
      : cellGpsFromFootprint(greenhouseName, col, bay, anchor) ?? { lat: 0, lng: 0 };

  const sw = point(0.5, 0.5);
  const se = point(colMax + 0.5, 0.5);
  const ne = point(colMax + 0.5, bayMax + 0.5);
  const nw = point(0.5, bayMax + 0.5);
  const outline = [sw, se, ne, nw];

  const columnLines: LatLng[][] = [];
  for (let c = 1; c < colMax; c++) {
    columnLines.push([point(c + 0.5, 0.5), point(c + 0.5, bayMax + 0.5)]);
  }
  const bayLines: LatLng[][] = [];
  for (let b = 1; b < bayMax; b++) {
    bayLines.push([point(0.5, b + 0.5), point(colMax + 0.5, b + 0.5)]);
  }
  return { outline, columnLines, bayLines };
}

export function georefCellGps(
  greenhouseName: string,
  column: number,
  bay: number,
  georef: GreenhouseGeoref | null,
  anchor?: LatLng | null,
): LatLng | null {
  if (georef) return georef.toGps(column, bay);
  return cellGpsFromFootprint(greenhouseName, column, bay, anchor);
}

export function georefResidualM(
  stop: Pick<ScoutRouteStop, "columnNo" | "bayNo" | "lat" | "lng">,
  georef: GreenhouseGeoref,
): number | null {
  if (stop.lat == null || stop.lng == null) return null;
  const pred = georef.toGps(stop.columnNo, stop.bayNo);
  return haversineMeters(
    { latitude: stop.lat, longitude: stop.lng },
    { latitude: pred.lat, longitude: pred.lng },
  );
}
