"use client";

import { useCallback } from "react";

import { matchesManagerDashboardFilters } from "@/lib/manager-dashboard-filters";
import { useManagerFilterSelection } from "@/store/manager-dashboard-filter-store";

export function useManagerDashboardFilterApply(enabled: boolean) {
  const selection = useManagerFilterSelection();

  const matches = useCallback(
    (item: {
      farmId?: string | null;
      greenhouseId?: string | null;
      greenhouseName?: string | null;
      cropType?: string | null;
      createdAt: string;
    }) => {
      if (!enabled) return true;
      return matchesManagerDashboardFilters(selection.sites, {
        farmId: selection.farmId,
        greenhouseId: selection.greenhouseId,
        variety: selection.variety,
        dateYmd: selection.dateYmd,
      }, item);
    },
    [enabled, selection],
  );

  return { ...selection, matches };
}
