import { bemackLocationByGreenhouseId } from "@/lib/bemack-master-data";
import type { GpsCoords } from "@/lib/gps";
import { useGreenhouseAnchorStore } from "@/store/greenhouse-anchor-store";
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

  if (!greenhouseId) return undefined;
  const fromStore = useGreenhouseAnchorStore
    .getState()
    .anchors.find((a) => a.greenhouseId === greenhouseId);
  if (fromStore) {
    return { latitude: fromStore.lat, longitude: fromStore.lng };
  }
  const gh = bemackLocationByGreenhouseId(greenhouseId);
  if (!gh) return undefined;
  return { latitude: gh.lat, longitude: gh.lng };
}
