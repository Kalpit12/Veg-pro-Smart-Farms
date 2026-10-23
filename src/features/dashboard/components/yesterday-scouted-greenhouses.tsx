"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { ChevronRight, Leaf } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoutingRoundReportDetail } from "@/features/dashboard/components/scouting-round-report-detail";
import { useRealtimeScouting } from "@/hooks/use-realtime-scouting";
import { formatStarGreenhouseLabel } from "@/lib/bemack-master-data";
import {
  calendarDayWindow,
  matchesManagerDashboardFilters,
} from "@/lib/manager-dashboard-filters";
import {
  calendarDayLabel,
  dedupeByGreenhouse,
  filterRoundsStartedOnDay,
  filterRoundsStartedOnDays,
  filterRoundsStartedYesterday,
  yesterdayLabel,
  yesterdayWindow,
  type YesterdayScoutRound,
} from "@/lib/scouting-yesterday";
import { useManagerFilterSelection } from "@/store/manager-dashboard-filter-store";
import { formatDistance, formatDuration } from "@/lib/route-metrics";
import { hasConfiguredBackend, isOfflineDemo } from "@/lib/data-backend";
import { getMyAssignedSitesAction } from "@/features/admin/supervisor-access-actions";
import {
  listScoutingRounds,
  listScoutingRoundsBetween,
} from "@/services/supabase/scouting-round-service";
import { useScoutingStore } from "@/store/scouting-store";
import { cn } from "@/lib/utils";

type Props = {
  scope?: "all" | "assigned";
  scoutingBasePath?: string;
  liveUpdates?: boolean;
  managerDashboardFilters?: boolean;
};

export function YesterdayScoutedGreenhouses({
  scope = "all",
  scoutingBasePath = "/admin/scouting",
  liveUpdates = true,
  managerDashboardFilters = false,
}: Props) {
  const managerFilters = useManagerFilterSelection();
  const demoRounds = useScoutingStore((s) => s.demoRounds);
  const [loading, setLoading] = useState(true);
  const [rawRounds, setRawRounds] = useState<YesterdayScoutRound[]>([]);
  const [selected, setSelected] = useState<YesterdayScoutRound | null>(null);
  const [assignedGreenhouseIds, setAssignedGreenhouseIds] = useState<
    Set<string> | null
  >(scope === "assigned" ? null : new Set());
  const initialLoad = useRef(true);

  useEffect(() => {
    if (scope !== "assigned") return;
    void getMyAssignedSitesAction().then((result) => {
      const ids = new Set<string>();
      for (const farm of result.data ?? []) {
        for (const gh of farm.greenhouses) {
          ids.add(gh.id);
        }
      }
      setAssignedGreenhouseIds(ids);
    });
  }, [scope]);

  const filterByScope = useCallback(
    (list: YesterdayScoutRound[]) => {
      if (scope !== "assigned" || !assignedGreenhouseIds) return list;
      return list.filter((r) => assignedGreenhouseIds.has(r.greenhouseId));
    },
    [scope, assignedGreenhouseIds],
  );

  const applyManagerFilters = useCallback(
    (list: YesterdayScoutRound[]) => {
      if (!managerDashboardFilters) return list;
      const { farmId, greenhouseId, variety, dateYmds, dateFilterAll, sites } =
        managerFilters;
      return list.filter((round) => {
        const farm = sites.find((f) => f.farmName === round.farmName);
        return matchesManagerDashboardFilters(sites, {
          farmId,
          greenhouseId,
          variety,
          dateYmds,
          dateFilterAll,
        }, {
          farmId: farm?.farmId,
          greenhouseId: round.greenhouseId,
          greenhouseName: round.greenhouseName,
          createdAt: round.startedAt,
        });
      });
    },
    [managerDashboardFilters, managerFilters],
  );

  const rounds = useMemo(
    () => applyManagerFilters(rawRounds),
    [rawRounds, applyManagerFilters],
  );

  const load = useCallback(async () => {
    if (scope === "assigned" && assignedGreenhouseIds === null) return;
    if (initialLoad.current) {
      setLoading(true);
    }
    const useDates = managerDashboardFilters && !managerFilters.dateFilterAll;
    const dateYmds = useDates ? managerFilters.dateYmds : [];
    const dayFilter = (list: YesterdayScoutRound[]) => {
      if (!managerDashboardFilters) return filterRoundsStartedYesterday(list);
      if (managerFilters.dateFilterAll) return list;
      return filterRoundsStartedOnDays(list, dateYmds);
    };

    if (isOfflineDemo()) {
      setRawRounds(filterByScope(dedupeByGreenhouse(dayFilter(demoRounds))));
      setLoading(false);
      return;
    }
    let from: Date;
    let to: Date;
    if (useDates && dateYmds.length) {
      const windows = dateYmds.map((ymd) => calendarDayWindow(ymd));
      from = windows.reduce((a, w) => (w.from < a ? w.from : a), windows[0]!.from);
      to = windows.reduce((a, w) => (w.to > a ? w.to : a), windows[0]!.to);
    } else if (managerDashboardFilters && managerFilters.dateFilterAll) {
      from = new Date();
      from.setDate(from.getDate() - 30);
      to = new Date();
    } else {
      ({ from, to } = yesterdayWindow());
    }
    const { data, error } = await listScoutingRoundsBetween(from, to);
    if (error || !data?.length) {
      const fallback = await listScoutingRounds(100);
      setRawRounds(
        filterByScope(dedupeByGreenhouse(dayFilter(fallback.data ?? []))),
      );
    } else {
      setRawRounds(filterByScope(dedupeByGreenhouse(dayFilter(data))));
    }
    setLoading(false);
    initialLoad.current = false;
  }, [
    demoRounds,
    scope,
    assignedGreenhouseIds,
    filterByScope,
    managerDashboardFilters,
    managerFilters.dateYmds,
    managerFilters.dateFilterAll,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeScouting(
    () => {
      void load();
    },
    { enabled: liveUpdates },
  );

  if (selected) {
    return (
      <ScoutingRoundReportDetail
        round={selected}
        onBack={() => setSelected(null)}
        scoutingBasePath={scoutingBasePath}
      />
    );
  }

  const waitingAssignments = scope === "assigned" && assignedGreenhouseIds === null;

  return (
    <section className="glass-card space-y-4 rounded-2xl p-4 sm:p-5">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">
            {managerDashboardFilters ? "Scouting" : "Scouted yesterday"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {managerDashboardFilters
              ? managerFilters.dateFilterAll
                ? "All dates — tap a greenhouse for the full report."
                : managerFilters.dateYmds.length === 1
                  ? `${calendarDayLabel(managerFilters.dateYmds[0]!)} — tap a greenhouse for the full report.`
                  : "Selected dates — tap a greenhouse for the full report."
              : `${yesterdayLabel()} — tap a greenhouse for the full scouting report.`}
            {scope === "assigned" ? " Only your assigned sites are shown." : null}
          </p>
        </div>
        {!loading && rounds.length > 0 ? (
          <Badge variant="outline">{rounds.length} house{rounds.length === 1 ? "" : "s"}</Badge>
        ) : null}
      </header>

      {waitingAssignments || loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : rounds.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          {scope === "assigned" && assignedGreenhouseIds?.size === 0
            ? "No greenhouses are assigned to your account yet."
            : managerDashboardFilters
              ? "No scouting rounds for this farm, greenhouse, variety, and date."
              : "No scouting rounds started yesterday for your sites. Completed walks will appear here each morning."}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rounds.map((round) => (
            <li key={round.roundId}>
              <button
                type="button"
                onClick={() => setSelected(round)}
                className={cn(
                  "flex h-full w-full flex-col rounded-xl border border-border bg-background/60 p-4 text-left transition-colors",
                  "hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                      <Leaf className="size-4" />
                    </span>
                    <div>
                      <p className="font-semibold leading-tight">{round.greenhouseName}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {formatStarGreenhouseLabel(round.greenhouseName)}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Scout</dt>
                    <dd className="font-medium">{round.scoutName}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Time</dt>
                    <dd className="font-medium">
                      {format(new Date(round.startedAt), "HH:mm")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Stops</dt>
                    <dd className="font-medium">{round.stopCount}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Walk</dt>
                    <dd className="font-medium">
                      {formatDuration(round.durationS)} · {formatDistance(round.distanceM)}
                    </dd>
                  </div>
                </dl>
                {round.coveragePct != null ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Coverage {round.coveragePct}%
                  </p>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
