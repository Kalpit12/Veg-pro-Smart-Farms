"use client";

import { AppSelect } from "@/components/ui/app-select";
import {
  ALL,
  greenhousesForFarm,
  varietiesForFarm,
  useManagerDashboardFilterStore,
} from "@/store/manager-dashboard-filter-store";

export function ManagerDashboardFiltersBar() {
  const sites = useManagerDashboardFilterStore((s) => s.sites);
  const farmId = useManagerDashboardFilterStore((s) => s.farmId);
  const greenhouseId = useManagerDashboardFilterStore((s) => s.greenhouseId);
  const variety = useManagerDashboardFilterStore((s) => s.variety);
  const setFarmId = useManagerDashboardFilterStore((s) => s.setFarmId);
  const setGreenhouseId = useManagerDashboardFilterStore((s) => s.setGreenhouseId);
  const setVariety = useManagerDashboardFilterStore((s) => s.setVariety);

  const farmOptions = [
    ...(sites.length > 1 ? [{ value: ALL, label: "All farms" }] : []),
    ...sites.map((f) => ({ value: f.farmId, label: f.farmName })),
  ];

  const greenhouseOptions = [
    { value: ALL, label: "All greenhouses" },
    ...greenhousesForFarm(sites, farmId)
      .filter((g) => variety === ALL || g.cropType === variety)
      .map((g) => ({ value: g.id, label: g.name })),
  ];

  const varietyOptions = [
    { value: ALL, label: "All varieties" },
    ...varietiesForFarm(sites, farmId, greenhouseId).map((v) => ({
      value: v,
      label: v,
    })),
  ];

  return (
    <div className="grid gap-2 border-t border-border/60 pt-3 sm:grid-cols-3">
      <div>
        <p className="mb-1 text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
          Farm
        </p>
        <AppSelect
          value={farmId === ALL && sites.length === 1 ? sites[0].farmId : farmId}
          onChange={setFarmId}
          options={farmOptions.length ? farmOptions : [{ value: ALL, label: "No farms" }]}
          disabled={!sites.length}
          size="sm"
          aria-label="Filter by farm"
        />
      </div>
      <div>
        <p className="mb-1 text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
          Greenhouse
        </p>
        <AppSelect
          value={greenhouseId}
          onChange={setGreenhouseId}
          options={greenhouseOptions}
          disabled={!sites.length}
          size="sm"
          aria-label="Filter by greenhouse"
        />
      </div>
      <div>
        <p className="mb-1 text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
          Variety
        </p>
        <AppSelect
          value={variety}
          onChange={setVariety}
          options={varietyOptions}
          disabled={!sites.length}
          size="sm"
          aria-label="Filter by variety"
        />
      </div>
    </div>
  );
}
