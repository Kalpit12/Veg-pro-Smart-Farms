/** CARTO Voyager when `NEXT_PUBLIC_CARTO_BASEMAPS_API_KEY` is set; otherwise OSM. */
export const MAP_BASEMAP_ATTRIBUTION =
  process.env.NEXT_PUBLIC_CARTO_BASEMAPS_API_KEY?.trim()
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export function getRasterBasemapTileUrl(): string {
  const key = process.env.NEXT_PUBLIC_CARTO_BASEMAPS_API_KEY?.trim();
  if (key) {
    return `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${encodeURIComponent(key)}`;
  }
  return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
}
