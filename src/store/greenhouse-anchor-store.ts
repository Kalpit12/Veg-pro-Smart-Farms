import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  mergeGreenhouseAnchors,
  syntheticGreenhouseAnchors,
  type GreenhouseAnchor,
} from "@/lib/greenhouse-locations";

type GreenhouseAnchorStore = {
  anchors: GreenhouseAnchor[];
  loadedAt: string | null;
  setFromDb: (dbRows: GreenhouseAnchor[]) => void;
  resetToSynthetic: () => void;
};

export const useGreenhouseAnchorStore = create<GreenhouseAnchorStore>()(
  persist(
    (set) => ({
      anchors: syntheticGreenhouseAnchors(),
      loadedAt: null,
      setFromDb: (dbRows) =>
        set({
          anchors: mergeGreenhouseAnchors(dbRows),
          loadedAt: new Date().toISOString(),
        }),
      resetToSynthetic: () =>
        set({
          anchors: syntheticGreenhouseAnchors(),
          loadedAt: null,
        }),
    }),
    {
      name: "vegpro-greenhouse-anchors",
      partialize: (s) => ({
        anchors: s.anchors,
        loadedAt: s.loadedAt,
      }),
    },
  ),
);
