import type { HotspotRow } from "@/services/supabase/infestation-service";

type SprayHotspotJoin = {
  pest_type?: string;
  main_issue?: string;
  severity?: number;
  status?: string;
  latitude?: number;
  longitude?: number;
  farm_id?: string;
  greenhouse_id?: string | null;
  farms?: { name?: string } | null;
  greenhouses?: { name?: string } | null;
};

type SprayLocationSource = {
  hotspot_id?: string | null;
  farms?: { name?: string } | null;
  greenhouses?: { name?: string } | null;
  infestation_hotspots?: SprayHotspotJoin | SprayHotspotJoin[] | null;
};

/** Prefer linked infestation report for spray location (authoritative). */
export function sprayLocationFromHotspot(
  spray: SprayLocationSource,
  hotspotsById?: Map<string, HotspotRow>,
) {
  const joined = Array.isArray(spray.infestation_hotspots)
    ? spray.infestation_hotspots[0]
    : spray.infestation_hotspots;

  if (joined?.greenhouses?.name || joined?.farms?.name) {
    return {
      farms: joined.farms ?? spray.farms,
      greenhouses: joined.greenhouses ?? spray.greenhouses,
      hotspot: joined,
    };
  }

  if (spray.hotspot_id && hotspotsById) {
    const hotspot = hotspotsById.get(spray.hotspot_id);
    if (hotspot) {
      return {
        farms: hotspot.farms ?? spray.farms,
        greenhouses: hotspot.greenhouses ?? spray.greenhouses,
        hotspot,
      };
    }
  }

  return {
    farms: spray.farms,
    greenhouses: spray.greenhouses,
    hotspot: joined ?? null,
  };
}

export function formatScoutingIssueLabel(
  issueType: string,
  issueName: string,
  rating?: number | null,
) {
  const typeLabel = issueType.charAt(0).toUpperCase() + issueType.slice(1);
  const ratingLabel = rating != null ? ` (${rating}/5)` : "";
  return `${typeLabel}: ${issueName}${ratingLabel}`;
}

export function sprayActivityNotes(
  productName: string,
  notes: string | null | undefined,
  hotspot?: SprayHotspotJoin | HotspotRow | null,
) {
  const base = notes ? `${productName} — ${notes}` : productName;
  if (hotspot?.pest_type && hotspot.severity != null) {
    return `${base} · ${hotspot.pest_type} severity ${hotspot.severity}/5`;
  }
  return base;
}
