/** Demo layout origin used by legacy seed 016 / bemackGreenhouseCoords. */
export const DEMO_LAYOUT_ORIGIN = { lat: -1.2921, lng: 36.8219 };

/**
 * Star / Naivasha farm centroid used when surveyed per-house GPS is not yet
 * imported. Relative house offsets from the demo layout are preserved.
 * Override with NEXT_PUBLIC_STAR_FARM_BASE_LAT / NEXT_PUBLIC_STAR_FARM_BASE_LNG.
 */
export function starFarmBaseCoords() {
  const lat = Number(process.env.NEXT_PUBLIC_STAR_FARM_BASE_LAT);
  const lng = Number(process.env.NEXT_PUBLIC_STAR_FARM_BASE_LNG);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }
  // Lake Naivasha floriculture corridor — replace with surveyed farm centroid.
  return { lat: -0.7172, lng: 36.431 };
}

/** Reproject a demo-layout coordinate onto the configured Star farm base. */
export function reprojectDemoLayoutToFarm(lat: number, lng: number) {
  const base = starFarmBaseCoords();
  return {
    lat: base.lat + (lat - DEMO_LAYOUT_ORIGIN.lat),
    lng: base.lng + (lng - DEMO_LAYOUT_ORIGIN.lng),
  };
}
