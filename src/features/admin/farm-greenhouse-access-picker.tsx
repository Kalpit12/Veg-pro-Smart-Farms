"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";
import type { FarmGreenhouseCatalogItem } from "@/features/admin/supervisor-access-actions";

type FarmGreenhouseAccessPickerProps = {
  catalog: FarmGreenhouseCatalogItem[];
  value: string[];
  onChange: (greenhouseIds: string[]) => void;
  disabled?: boolean;
  className?: string;
};

export function FarmGreenhouseAccessPicker({
  catalog,
  value,
  onChange,
  disabled,
  className,
}: FarmGreenhouseAccessPickerProps) {
  const selected = useMemo(() => new Set(value), [value]);

  const toggleGreenhouse = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    onChange([...next]);
  };

  const toggleFarm = (farm: FarmGreenhouseCatalogItem, checked: boolean) => {
    const next = new Set(selected);
    for (const gh of farm.greenhouses) {
      if (checked) next.add(gh.id);
      else next.delete(gh.id);
    }
    onChange([...next]);
  };

  if (!catalog.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No farms or greenhouses in the database yet. Seed farms first, then assign access.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "max-h-64 space-y-3 overflow-y-auto rounded-xl border border-border bg-muted/20 p-3",
        className,
      )}
    >
      {catalog.map((farm) => {
        const ghIds = farm.greenhouses.map((g) => g.id);
        const selectedInFarm = ghIds.filter((id) => selected.has(id)).length;
        const allInFarm = ghIds.length > 0 && selectedInFarm === ghIds.length;
        const someInFarm = selectedInFarm > 0 && !allInFarm;

        return (
          <fieldset key={farm.farmId} className="space-y-2" disabled={disabled}>
            <legend className="sr-only">{farm.farmName}</legend>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                className="size-4 rounded border-border"
                checked={allInFarm}
                ref={(el) => {
                  if (el) el.indeterminate = someInFarm;
                }}
                onChange={(e) => toggleFarm(farm, e.target.checked)}
              />
              <span>{farm.farmName}</span>
              <span className="font-normal text-muted-foreground">
                ({selectedInFarm}/{ghIds.length} greenhouses)
              </span>
            </label>
            <ul className="ml-6 space-y-1.5">
              {farm.greenhouses.map((gh) => (
                <li key={gh.id}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-border"
                      checked={selected.has(gh.id)}
                      onChange={(e) => toggleGreenhouse(gh.id, e.target.checked)}
                    />
                    <span>{gh.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        );
      })}
    </div>
  );
}
