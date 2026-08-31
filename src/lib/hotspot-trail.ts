export type TrailPoint = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  kind: "origin" | "spray" | "scout" | "gps";
  at: string;
};

type HotspotOrigin = {
  id: string;
  latitude: number;
  longitude: number;
  pest_type: string;
  created_at: string;
};

type SprayVisit = {
  id: string;
  latitude: number;
  longitude: number;
  product_name: string;
  created_at: string;
  users?: { full_name?: string } | null;
};

type ScoutVisit = {
  id: string;
  latitude: number;
  longitude: number;
  issue_name: string;
  created_at: string;
  users?: { full_name?: string } | null;
};

type GpsCrumb = {
  id: string;
  latitude: number;
  longitude: number;
  created_at: string;
};

/** All points in time order — used to draw the orange path on the map. */
export function buildHotspotTrail(
  hotspot: HotspotOrigin,
  sprays: SprayVisit[],
  scouts: ScoutVisit[] = [],
  gpsCrumbs: GpsCrumb[] = [],
): TrailPoint[] {
  const origin: TrailPoint = {
    id: `hotspot-${hotspot.id}`,
    lat: hotspot.latitude,
    lng: hotspot.longitude,
    label: `Reported: ${hotspot.pest_type}`,
    kind: "origin",
    at: hotspot.created_at,
  };

  const sprayPoints = sprays.map((spray) => ({
    id: spray.id,
    lat: spray.latitude,
    lng: spray.longitude,
    label: `Spray: ${spray.product_name}${spray.users?.full_name ? ` · ${spray.users.full_name}` : ""}`,
    kind: "spray" as const,
    at: spray.created_at,
  }));

  const scoutPoints = scouts.map((scout) => ({
    id: scout.id,
    lat: scout.latitude,
    lng: scout.longitude,
    label: `Scout: ${scout.issue_name}${scout.users?.full_name ? ` · ${scout.users.full_name}` : ""}`,
    kind: "scout" as const,
    at: scout.created_at,
  }));

  const gpsPoints = gpsCrumbs.map((crumb, index) => ({
    id: crumb.id || `gps-${index}`,
    lat: crumb.latitude,
    lng: crumb.longitude,
    label: "Worker GPS on the way",
    kind: "gps" as const,
    at: crumb.created_at,
  }));

  return [origin, ...sprayPoints, ...scoutPoints, ...gpsPoints].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );
}

/** Numbered stops on the map (skip GPS crumbs and origin — hotspot pin already shows origin). */
export function trailStopMarkers(trail: TrailPoint[]) {
  return trail.filter((point) => point.kind === "spray" || point.kind === "scout");
}
