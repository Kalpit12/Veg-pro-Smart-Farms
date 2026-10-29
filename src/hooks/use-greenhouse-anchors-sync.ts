"use client";

import { useEffect } from "react";

import { isOfflineDemo } from "@/lib/data-backend";
import { getMyAssignedSitesAction } from "@/features/admin/supervisor-access-actions";
import { listGreenhouseAnchors } from "@/services/supabase/greenhouse-service";
import { useGreenhouseAnchorStore, type FieldSite } from "@/store/greenhouse-anchor-store";

/**
 * Keep field GPS / geofence anchors aligned with DB (surveyed) coords, and
 * restrict the worker greenhouse list to the sites assigned by admin
 * (Staff -> Monitored sites). Built-in Star demo houses are only used when
 * the user has no assignment and the DB has no coordinates.
 */
export function useGreenhouseAnchorsSync() {
  const setFromDb = useGreenhouseAnchorStore((s) => s.setFromDb);
  const setFieldSites = useGreenhouseAnchorStore((s) => s.setFieldSites);
  const resetToSynthetic = useGreenhouseAnchorStore((s) => s.resetToSynthetic);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [anchorsResult, assignedResult] = await Promise.all([
        listGreenhouseAnchors().catch(() => ({ data: [], error: new Error("offline") })),
        getMyAssignedSitesAction().catch(() => null),
      ]);
      if (cancelled) return;

      // Server unreachable: offline demo uses the built-in Star sheet; live site keeps cache.
      if (!assignedResult && anchorsResult.error) {
        if (isOfflineDemo()) resetToSynthetic();
        return;
      }

      const seenNames = new Set<string>();
      const sites: FieldSite[] = [];
      for (const farm of assignedResult?.data ?? []) {
        for (const gh of farm.greenhouses) {
          const key = `${farm.farmId}|${gh.name}`;
          if (seenNames.has(key)) continue; // duplicate greenhouse rows in DB
          seenNames.add(key);
          sites.push({
            farmId: farm.farmId,
            farmName: farm.farmName,
            greenhouseId: gh.id,
            greenhouseName: gh.name,
            cropType: gh.cropType ?? null,
          });
        }
      }
      const allowedIds = new Set(
        (assignedResult?.data ?? []).flatMap((f) => f.greenhouses.map((g) => g.id)),
      );
      const data = anchorsResult.data ?? [];

      if (allowedIds.size > 0) {
        setFieldSites(sites);
        setFromDb(
          data.filter((row) => allowedIds.has(row.greenhouseId)),
          { includeSynthetic: false },
        );
        return;
      }

      setFieldSites([]);
      if (isOfflineDemo() && (anchorsResult.error || !data.length)) {
        resetToSynthetic();
        return;
      }
      // Live DB: only real greenhouses, never the built-in Star demo list.
      setFromDb(data, { includeSynthetic: false });
    })();
    return () => {
      cancelled = true;
    };
  }, [setFromDb, setFieldSites, resetToSynthetic]);
}
