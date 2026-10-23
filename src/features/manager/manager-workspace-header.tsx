"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { formatHeaderDatesSummary } from "@/lib/manager-dashboard-filters";
import {
  getMyAssignedSitesAction,
  listFarmsGreenhousesCatalogAction,
} from "@/features/admin/supervisor-access-actions";
import { DashboardDateFilter } from "@/features/manager/dashboard-date-filter";
import { ManagerDashboardFiltersBar } from "@/features/manager/manager-dashboard-filters-bar";
import { useManagerDashboardFilterStore } from "@/store/manager-dashboard-filter-store";

function farmTitleLabel(
  sites: { farmId: string; farmName: string }[],
  farmId: string,
) {
  if (farmId !== "all") {
    const farm = sites.find((f) => f.farmId === farmId);
    if (farm) return farm.farmName;
  }
  if (sites.length === 1) return sites[0].farmName;
  if (sites.length > 1) return `${sites.length} farms`;
  return null;
}

type Props = {
  mode: "manager" | "admin";
};

export function ManagerWorkspaceHeader({ mode }: Props) {
  const pathname = usePathname();
  const onDashboard =
    mode === "manager"
      ? pathname.startsWith("/manager/dashboard")
      : pathname.startsWith("/admin/dashboard");
  const sites = useManagerDashboardFilterStore((s) => s.sites);
  const sitesLoaded = useManagerDashboardFilterStore((s) => s.sitesLoaded);
  const farmId = useManagerDashboardFilterStore((s) => s.farmId);
  const dateYmds = useManagerDashboardFilterStore((s) => s.dateYmds);
  const dateFilterAll = useManagerDashboardFilterStore((s) => s.dateFilterAll);
  const setSites = useManagerDashboardFilterStore((s) => s.setSites);
  const resetSitesLoad = useManagerDashboardFilterStore((s) => s.resetSitesLoad);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingSites, setLoadingSites] = useState(!sitesLoaded);

  const loadSites = useCallback(async () => {
    resetSitesLoad();
    setLoadingSites(true);
    setLoadError(null);
    try {
      const result =
        mode === "admin"
          ? await listFarmsGreenhousesCatalogAction()
          : await getMyAssignedSitesAction();
      if (result.error) {
        setLoadError(result.error.message);
        return;
      }
      setSites(result.data ?? []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load farms.");
    } finally {
      setLoadingSites(false);
    }
  }, [setSites, resetSitesLoad, mode]);

  useEffect(() => {
    resetSitesLoad();
    void loadSites();
  }, [mode, loadSites, resetSitesLoad]);

  const farmLabel = farmTitleLabel(sites, farmId);
  const roleLabel = mode === "admin" ? "Admin" : "Farm manager";

  return (
    <div className="min-w-0 flex-1 space-y-2">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">
            {roleLabel}
            {farmLabel ? (
              <span className="font-normal text-muted-foreground"> · {farmLabel}</span>
            ) : loadingSites ? (
              <span className="font-normal text-muted-foreground"> · …</span>
            ) : null}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatHeaderDatesSummary(dateYmds, dateFilterAll)}
          </p>
          {loadError ? (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="text-xs text-destructive">{loadError}</p>
              <Button type="button" size="sm" variant="outline" onClick={() => void loadSites()}>
                Retry
              </Button>
            </div>
          ) : null}
        </div>
        {onDashboard ? <DashboardDateFilter /> : null}
      </div>
      {onDashboard ? (
        <ManagerDashboardFiltersBar
          loading={loadingSites}
          loadError={loadError}
          onRetry={loadSites}
          showAllFarmsOption={mode === "admin" || sites.length > 1}
        />
      ) : null}
    </div>
  );
}
