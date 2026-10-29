import { kenyaNowIso } from "@/lib/kenya-time";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  mergeGreenhouseAnchors,
  syntheticGreenhouseAnchors,
  type GreenhouseAnchor,
} from "@/lib/greenhouse-locations";

/** Greenhouse the signed-in worker / manager is assigned to (from admin "Monitored sites"). */
export type FieldSite = {
  farmId: string;
  farmName: string;
  greenhouseId: string;
  greenhouseName: string;
  cropType?: string | null;
};

type GreenhouseAnchorStore = {
  anchors: GreenhouseAnchor[];
  /** Assigned sites; empty = no restriction (show all anchors). */
  fieldSites: FieldSite[];
  loadedAt: string | null;
  setFromDb: (dbRows: GreenhouseAnchor[], options?: { includeSynthetic?: boolean }) => void;
  setFieldSites: (sites: FieldSite[]) => void;
  resetToSynthetic: () => void;
};

export const useGreenhouseAnchorStore = create<GreenhouseAnchorStore>()(
  persist(
    (set) => ({
      anchors: syntheticGreenhouseAnchors(),
      fieldSites: [],
      loadedAt: null,
      setFromDb: (dbRows, options) =>
        set({
          anchors:
            options?.includeSynthetic === false
              ? dbRows.filter(
                  (r) => r.greenhouseId && Number.isFinite(r.lat) && Number.isFinite(r.lng),
                )
              : mergeGreenhouseAnchors(dbRows),
          loadedAt: kenyaNowIso(),
        }),
      setFieldSites: (sites) => set({ fieldSites: sites }),
      resetToSynthetic: () =>
        set({
          anchors: syntheticGreenhouseAnchors(),
          fieldSites: [],
          loadedAt: null,
        }),
    }),
    {
      name: "vegpro-greenhouse-anchors",
      partialize: (s) => ({
        anchors: s.anchors,
        fieldSites: s.fieldSites,
        loadedAt: s.loadedAt,
      }),
    },
  ),
);
