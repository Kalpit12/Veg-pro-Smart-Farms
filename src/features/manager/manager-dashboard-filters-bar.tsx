"use client";

import { Button } from "@/components/ui/button";
import { AppSelect } from "@/components/ui/app-select";
import {
  ALL,
  greenhousesForFarm,
  varietiesForFarm,
  useManagerDashboardFilterStore,
} from "@/store/manager-dashboard-filter-store";

type Props = {
  loading?: boolean;
  loadError?: string | null;
  onRetry?: () => void;
};

export function ManagerDashboardFiltersBar({ loading = false, loadError, onRetry }: Props) {
  const sites = useManagerDashboardFilterStore((s) => s.sites);
  const farmId = useManagerDashboardFilterStore((s) => s.farmId);
  const greenhouseId = useManagerDashboardFilterStore((s) => s.greenhouseId);
  const variety = useManagerDashboardFilterStore((s) => s.variety);
  const setFarmId = useManagerDashboardFilterStore((s) => s.setFarmId);
  const setGreenhouseId = useManagerDashboardFilterStore((s) => s.setGreenhouseId);
  const setVariety = useManagerDashboardFilterStore((s) => s.setVariety);

  const disabled = loading || !!loadError || !sites.length;

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

  const farmPlaceholder = loading
    ? "Loading farms…"
    : loadError
      ? "Could not load farms"
      : sites.length
        ? undefined
        : "No farms assigned";

  return (
    <div className="space-y-2 border-t border-border/60 pt-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="min-w-0">
          <p className="mb-1 truncate text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
            Farm
          </p>
          <AppSelect
            value={
              farmId === ALL && sites.length === 1 ? sites[0].farmId : farmId
            }
            onChange={setFarmId}
            options={
              farmOptions.length
                ? farmOptions
                : [{ value: ALL, label: farmPlaceholder ?? "No farms" }]
            }
            disabled={disabled}
            placeholder={farmPlaceholder}
            size="sm"
            aria-label="Filter by farm"
          />
        </div>
        <div className="min-w-0">
          <p className="mb-1 truncate text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
            Site
          </p>
          <AppSelect
            value={greenhouseId}
            onChange={setGreenhouseId}
            options={greenhouseOptions}
            disabled={disabled}
            size="sm"
            aria-label="Filter by greenhouse"
          />
        </div>
        <div className="min-w-0">
          <p className="mb-1 truncate text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
            Variety
          </p>
          <AppSelect
            value={variety}
            onChange={setVariety}
            options={varietyOptions}
            disabled={disabled}
            size="sm"
            aria-label="Filter by variety"
          />
        </div>
      </div>
      {loadError && onRetry ? (
        <p className="text-xs text-muted-foreground">
          Filters need your assigned farms from the server.{" "}
          <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={onRetry}>
            Try again
          </Button>
        </p>
      ) : null}
    </div>
  );
}
