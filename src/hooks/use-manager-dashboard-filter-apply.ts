"use client";

import { useCallback } from "react";

import { matchesManagerDashboardFilters } from "@/lib/manager-dashboard-filters";
import { useManagerFilterSelection } from "@/store/manager-dashboard-filter-store";

export function useManagerDashboardFilterApply(enabled: boolean) {
  const {
    farmId,
    greenhouseId,
    variety,
    dateYmds,
    dateFilterAll,
    sites,
  } = useManagerFilterSelection();

  const matches = useCallback(
    (item: {
      farmId?: string | null;
      greenhouseId?: string | null;
      greenhouseName?: string | null;
      cropType?: string | null;
      createdAt: string;
    }) => {
      if (!enabled) return true;
      return matchesManagerDashboardFilters(
        sites,
        { farmId, greenhouseId, variety, dateYmds, dateFilterAll },
        item,
      );
    },
    [enabled, farmId, greenhouseId, variety, dateYmds, dateFilterAll, sites],
  );

  return { farmId, greenhouseId, variety, dateYmds, dateFilterAll, sites, matches };
}
