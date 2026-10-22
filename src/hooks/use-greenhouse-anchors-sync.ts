"use client";

import { useEffect } from "react";

import { hasConfiguredBackend, isOfflineDemo } from "@/lib/data-backend";
import { listGreenhouseAnchors } from "@/services/supabase/greenhouse-service";
import { useGreenhouseAnchorStore } from "@/store/greenhouse-anchor-store";

/** Keep field GPS / geofence anchors aligned with DB (surveyed) coords. */
export function useGreenhouseAnchorsSync() {
  const setFromDb = useGreenhouseAnchorStore((s) => s.setFromDb);
  const resetToSynthetic = useGreenhouseAnchorStore((s) => s.resetToSynthetic);

  useEffect(() => {
    if (isOfflineDemo()) {
      resetToSynthetic();
      return;
    }
    let cancelled = false;
    void listGreenhouseAnchors().then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data.length) {
        resetToSynthetic();
        return;
      }
      setFromDb(data);
    });
    return () => {
      cancelled = true;
    };
  }, [setFromDb, resetToSynthetic]);
}
