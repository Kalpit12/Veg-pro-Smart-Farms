"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { todayDateYmd } from "@/lib/manager-dashboard-filters";
import { useManagerDashboardFilterStore } from "@/store/manager-dashboard-filter-store";

export function DashboardDateFilter() {
  const dateYmds = useManagerDashboardFilterStore((s) => s.dateYmds);
  const dateFilterAll = useManagerDashboardFilterStore((s) => s.dateFilterAll);
  const addDateYmd = useManagerDashboardFilterStore((s) => s.addDateYmd);
  const removeDateYmd = useManagerDashboardFilterStore((s) => s.removeDateYmd);
  const setDateFilterAll = useManagerDashboardFilterStore((s) => s.setDateFilterAll);

  return (
    <div className="flex min-w-0 flex-col gap-1.5 sm:items-end">
      <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={dateFilterAll}
            onChange={(e) => setDateFilterAll(e.target.checked)}
            className="size-3.5 rounded border-border"
          />
          All dates
        </label>
        {!dateFilterAll ? (
          <>
            <input
              type="date"
              className="rounded-lg border border-primary/20 bg-background/80 px-2 py-1 text-sm"
              onChange={(e) => {
                if (e.target.value) addDateYmd(e.target.value);
                e.target.value = "";
              }}
              aria-label="Add date to filter"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => addDateYmd(todayDateYmd())}
            >
              Today
            </Button>
          </>
        ) : null}
      </div>
      {!dateFilterAll && dateYmds.length ? (
        <ul className="flex max-w-full flex-wrap justify-end gap-1">
          {dateYmds.map((ymd) => (
            <li key={ymd}>
              <span className="inline-flex items-center gap-0.5 rounded-md bg-background/90 px-2 py-0.5 text-xs font-medium tabular-nums ring-1 ring-primary/15">
                {ymd}
                {dateYmds.length > 1 ? (
                  <button
                    type="button"
                    className="rounded p-0.5 hover:bg-muted"
                    aria-label={`Remove ${ymd}`}
                    onClick={() => removeDateYmd(ymd)}
                  >
                    <X className="size-3" />
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
