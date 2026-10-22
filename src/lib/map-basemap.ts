export type BasemapConfig = {
  url: string;
  attribution: string;
};

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

function cartoVoyagerUrl(key: string) {
  return `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${encodeURIComponent(key)}`;
}

/** Resolve basemap from env (server at runtime, or client build-time inlining for NEXT_PUBLIC_*). */
export function resolveBasemapConfig(
  env: Pick<NodeJS.ProcessEnv, "NEXT_PUBLIC_MAP_TILE_URL" | "CARTO_BASEMAPS_API_KEY" | "NEXT_PUBLIC_CARTO_BASEMAPS_API_KEY">,
): BasemapConfig {
  const full = env.NEXT_PUBLIC_MAP_TILE_URL?.trim();
  if (full) {
    const isCarto = full.includes("cartocdn.com");
    return { url: full, attribution: isCarto ? CARTO_ATTRIBUTION : OSM_ATTRIBUTION };
  }

  const key = (env.CARTO_BASEMAPS_API_KEY ?? env.NEXT_PUBLIC_CARTO_BASEMAPS_API_KEY)?.trim();
  if (key) {
    return { url: cartoVoyagerUrl(key), attribution: CARTO_ATTRIBUTION };
  }

  return { url: OSM_TILE_URL, attribution: OSM_ATTRIBUTION };
}

export function getRasterBasemapTileUrl(): string {
  return resolveBasemapConfig(process.env).url;
}

export const MAP_BASEMAP_ATTRIBUTION = resolveBasemapConfig(process.env).attribution;
