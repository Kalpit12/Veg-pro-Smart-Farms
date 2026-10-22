"use client";

import { useEffect } from "react";

import { hasConfiguredBackend, isOfflineDemo } from "@/lib/data-backend";
import { getMyFieldGreenhouseIdsAction } from "@/features/admin/supervisor-access-actions";
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
    void (async () => {
      const [{ data, error }, allowedIds] = await Promise.all([
        listGreenhouseAnchors(),
        getMyFieldGreenhouseIdsAction(),
      ]);
      if (cancelled) return;
      if (error || !data.length) {
        resetToSynthetic();
        return;
      }
      const filtered =
        allowedIds.length > 0
          ? data.filter((row) => allowedIds.includes(row.greenhouseId))
          : data;
      if (!filtered.length) {
        resetToSynthetic();
        return;
      }
      setFromDb(filtered);
    })();
    return () => {
      cancelled = true;
    };
  }, [setFromDb, resetToSynthetic]);
}
