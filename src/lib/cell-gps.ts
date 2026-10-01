import { cellGpsFromFootprint } from "@/lib/greenhouse-grid-georef";
import type { GpsCoords } from "@/lib/gps";

/**
 * Map a Star bay×column cell onto the greenhouse GPS footprint.
 * Uses surveyed area (sqm) and bay/column counts for scale.
 */
export function cellGpsInGreenhouse(
  greenhouseName: string,
  column: number,
  bay: number,
): GpsCoords | null {
  const p = cellGpsFromFootprint(greenhouseName, column, bay);
  if (!p) return null;
  return { latitude: p.lat, longitude: p.lng };
}

/**
 * Persist the device fix. Cell identity is stored as column × bay;
 * interpolating a synthetic pin would hide real GPS accuracy in the field.
 */
export function resolveScoutCoords(input: {
  live: GpsCoords;
  greenhouseId: string;
  greenhouseName: string;
  column: number;
  bay: number;
}): GpsCoords {
  void input.greenhouseId;
  void input.greenhouseName;
  void input.column;
  void input.bay;
  return input.live;
}
