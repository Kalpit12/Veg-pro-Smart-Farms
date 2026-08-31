import { create } from "zustand";
import { persist } from "zustand/middleware";

type GpsCrumb = {
  id: string;
  latitude: number;
  longitude: number;
  created_at: string;
};

type HotspotTrailStore = {
  breadcrumbs: Record<string, GpsCrumb[]>;
  addBreadcrumb: (hotspotId: string, latitude: number, longitude: number) => void;
  getBreadcrumbs: (hotspotId: string) => GpsCrumb[];
  clearBreadcrumbs: (hotspotId: string) => void;
};

function distanceM(a: { latitude: number; longitude: number }, b: GpsCrumb) {
  const dLat = (a.latitude - b.latitude) * 111_320;
  const dLng =
    (a.longitude - b.longitude) * 111_320 * Math.cos((a.latitude * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

export const useHotspotTrailStore = create<HotspotTrailStore>()(
  persist(
    (set, get) => ({
      breadcrumbs: {},
      addBreadcrumb: (hotspotId, latitude, longitude) => {
        const now = new Date().toISOString();
        const nextPoint = { id: `gps-${Date.now()}`, latitude, longitude, created_at: now };
        set((state) => {
          const prev = state.breadcrumbs[hotspotId] ?? [];
          const last = prev[prev.length - 1];
          if (last) {
            const tooSoon = Date.now() - new Date(last.created_at).getTime() < 30_000;
            const tooClose = distanceM({ latitude, longitude }, last) < 8;
            if (tooSoon && tooClose) return state;
          }
          const trimmed = [...prev, nextPoint].slice(-40);
          return {
            breadcrumbs: { ...state.breadcrumbs, [hotspotId]: trimmed },
          };
        });
      },
      getBreadcrumbs: (hotspotId) => get().breadcrumbs[hotspotId] ?? [],
      clearBreadcrumbs: (hotspotId) =>
        set((state) => {
          const next = { ...state.breadcrumbs };
          delete next[hotspotId];
          return { breadcrumbs: next };
        }),
    }),
    { name: "vegpro-hotspot-trails" },
  ),
);
