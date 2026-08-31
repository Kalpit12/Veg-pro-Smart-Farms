import { bemackLocationByGreenhouseId } from "@/lib/bemack-master-data";
import type { GpsCoords } from "@/lib/gps";
import type { ResumeHotspot } from "@/store/resume-hotspot-store";

/** Prefer resumed hotspot GPS, then greenhouse anchor. */
export function gpsAnchorForFieldWork(
  resumeHotspot: ResumeHotspot | null,
  greenhouseId: string | null,
): GpsCoords | undefined {
  if (resumeHotspot) {
    return {
      latitude: resumeHotspot.latitude,
      longitude: resumeHotspot.longitude,
    };
  }

  const gh = greenhouseId ? bemackLocationByGreenhouseId(greenhouseId) : null;
  if (!gh) return undefined;
  return { latitude: gh.lat, longitude: gh.lng };
}
