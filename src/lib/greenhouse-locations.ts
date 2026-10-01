import { BEMACK_DEMO_LOCATIONS } from "@/lib/bemack-master-data";
import { reprojectDemoLayoutToFarm } from "@/lib/farm-gps-base";

export type GreenhouseAnchor = {
  farmId: string;
  farmName: string;
  greenhouseId: string;
  greenhouseName: string;
  lat: number;
  lng: number;
  qrValue?: string;
  /** True when coords came from greenhouses table (not client synthetic fallback). */
  fromDb?: boolean;
};

export {
  DEMO_LAYOUT_ORIGIN,
  reprojectDemoLayoutToFarm,
  starFarmBaseCoords,
} from "@/lib/farm-gps-base";

export function syntheticGreenhouseAnchors(): GreenhouseAnchor[] {
  return BEMACK_DEMO_LOCATIONS.map((loc) => ({
    farmId: loc.farmId,
    farmName: loc.farmName,
    greenhouseId: loc.greenhouseId,
    greenhouseName: loc.greenhouseName,
    lat: loc.lat,
    lng: loc.lng,
    qrValue: loc.qrValue,
    fromDb: false,
  }));
}

/**
 * Prefer DB anchors (already surveyed or migrated). Fill gaps from synthetic
 * layout (already reprojected to Star farm base) so offline still resolves.
 */
export function mergeGreenhouseAnchors(
  dbRows: GreenhouseAnchor[],
): GreenhouseAnchor[] {
  const byId = new Map<string, GreenhouseAnchor>();
  for (const syn of syntheticGreenhouseAnchors()) {
    byId.set(syn.greenhouseId, syn);
  }
  for (const row of dbRows) {
    if (
      row.greenhouseId &&
      Number.isFinite(row.lat) &&
      Number.isFinite(row.lng)
    ) {
      byId.set(row.greenhouseId, { ...row, fromDb: true });
    }
  }
  return Array.from(byId.values());
}

export function anchorByGreenhouseId(
  greenhouseId: string | null | undefined,
  anchors: GreenhouseAnchor[],
) {
  if (!greenhouseId) return null;
  return anchors.find((a) => a.greenhouseId === greenhouseId) ?? null;
}

export function anchorByGreenhouseName(
  greenhouseName: string | null | undefined,
  anchors: GreenhouseAnchor[],
) {
  if (!greenhouseName) return null;
  return anchors.find((a) => a.greenhouseName === greenhouseName) ?? null;
}

/** Helper for one-off callers that still hold demo-layout coords. */
export function projectLegacyDemoCoord(lat: number, lng: number) {
  return reprojectDemoLayoutToFarm(lat, lng);
}
