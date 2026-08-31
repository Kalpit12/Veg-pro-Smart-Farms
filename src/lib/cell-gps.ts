import {
  bayMaxForGreenhouse,
  bemackLocationByName,
  columnCountForBay,
} from "@/lib/bemack-master-data";
import type { GpsCoords } from "@/lib/gps";
import { checkGreenhouseGeofence } from "@/lib/scouting-geofence";

const METERS_PER_DEG_LAT = 111_320;

function offsetMeters(origin: GpsCoords, eastM: number, northM: number): GpsCoords {
  const latRad = (origin.latitude * Math.PI) / 180;
  return {
    latitude: origin.latitude + northM / METERS_PER_DEG_LAT,
    longitude: origin.longitude + eastM / (METERS_PER_DEG_LAT * Math.cos(latRad)),
  };
}

/**
 * Map a Star bay×column cell onto the greenhouse GPS footprint.
 * Columns run east, bays run north from the house anchor (SW).
 */
export function cellGpsInGreenhouse(
  greenhouseName: string,
  column: number,
  bay: number,
): GpsCoords | null {
  const loc = bemackLocationByName(greenhouseName);
  if (!loc) return null;
  const bayMax = bayMaxForGreenhouse(greenhouseName);
  const colMax = Math.max(1, columnCountForBay(greenhouseName, bay));
  const origin: GpsCoords = { latitude: loc.lat, longitude: loc.lng };
  const widthM = Math.max(28, colMax * 3.2);
  const lengthM = Math.max(36, bayMax * 4.2);
  const east = ((column - 0.5) / colMax) * widthM;
  const north = ((bay - 0.5) / bayMax) * lengthM;
  return offsetMeters(origin, east, north);
}

/**
 * Scouting truth is bay×column. GPS is kept when it is a real farm fix
 * (far from demo anchors). When the phone is on the demo/Nairobi grid,
 * snap to the tapped cell so heat map and map pins agree.
 */
export function resolveScoutCoords(input: {
  live: GpsCoords;
  greenhouseId: string;
  greenhouseName: string;
  column: number;
  bay: number;
}): GpsCoords {
  const cell = cellGpsInGreenhouse(input.greenhouseName, input.column, input.bay);
  const fence = checkGreenhouseGeofence(input.live, input.greenhouseId);
  if (!fence || fence.anchorMismatch || !cell) return input.live;
  if (fence.inside) return cell;
  return input.live;
}
