"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { formatHeaderDate } from "@/lib/manager-dashboard-filters";
import { getMyAssignedSitesAction } from "@/features/admin/supervisor-access-actions";
import { ManagerDashboardFiltersBar } from "@/features/manager/manager-dashboard-filters-bar";
import {
  useManagerDashboardFilterStore,
} from "@/store/manager-dashboard-filter-store";

function farmTitleLabel(sites: { farmId: string; farmName: string }[], farmId: string) {
  if (farmId !== "all") {
    const farm = sites.find((f) => f.farmId === farmId);
    if (farm) return farm.farmName;
  }
  if (sites.length === 1) return sites[0].farmName;
  if (sites.length > 1) return `${sites.length} farms`;
  return null;
}

export function ManagerWorkspaceHeader() {
  const pathname = usePathname();
  const onDashboard = pathname.startsWith("/manager/dashboard");
  const sites = useManagerDashboardFilterStore((s) => s.sites);
  const sitesLoaded = useManagerDashboardFilterStore((s) => s.sitesLoaded);
  const farmId = useManagerDashboardFilterStore((s) => s.farmId);
  const dateYmd = useManagerDashboardFilterStore((s) => s.dateYmd);
  const setSites = useManagerDashboardFilterStore((s) => s.setSites);
  const setDateYmd = useManagerDashboardFilterStore((s) => s.setDateYmd);

  useEffect(() => {
    if (sitesLoaded) return;
    void getMyAssignedSitesAction().then((result) => {
      setSites(result.data ?? []);
    });
  }, [sitesLoaded, setSites]);

  const farmLabel = farmTitleLabel(sites, farmId);

  return (
    <div className="min-w-0 flex-1 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            Farm manager
            {farmLabel ? (
              <span className="text-muted-foreground"> · {farmLabel}</span>
            ) : sitesLoaded ? null : (
              <span className="text-muted-foreground"> · …</span>
            )}
          </p>
        </div>
        <div className="shrink-0 sm:min-w-[11rem]">
          <label className="mb-1 block text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
            Date
          </label>
          <input
            id="manager-header-date"
            type="date"
            value={dateYmd}
            onChange={(e) => setDateYmd(e.target.value)}
            className="w-full rounded-lg border border-primary/25 bg-primary/[0.04] px-2.5 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {formatHeaderDate(dateYmd)}
          </p>
        </div>
      </div>
      {onDashboard ? <ManagerDashboardFiltersBar /> : null}
    </div>
  );
}
