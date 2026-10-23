"use client";

import {
  differenceInCalendarDays,
  endOfDay,
  format,
  isSameDay,
  startOfDay,
} from "date-fns";
import { CalendarDays } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  formatHeaderDatesSummary,
  isOnCalendarDay,
  matchesManagerDashboardFilters,
  todayDateYmd,
} from "@/lib/manager-dashboard-filters";
import { useManagerDashboardFilterStore } from "@/store/manager-dashboard-filter-store";

import { Button } from "@/components/ui/button";
import {
  useScoutingData,
  useScoutingRounds,
  type UnifiedScoutingRecord,
  type UnifiedScoutingRound,
} from "@/hooks/use-scouting-data";
import { hasConfiguredBackend } from "@/lib/data-backend";
import { formatDistance } from "@/lib/route-metrics";
import { listScoutingRoundsBetween } from "@/services/supabase/scouting-round-service";
import { useScoutingStore } from "@/store/scouting-store";
import { cn } from "@/lib/utils";

function isWithinDay(iso: string, day: Date) {
  const t = new Date(iso).getTime();
  return t >= startOfDay(day).getTime() && t <= endOfDay(day).getTime();
}

function computeKpis(
  dayRecords: UnifiedScoutingRecord[],
  dayRounds: UnifiedScoutingRound[],
  isToday: boolean,
) {
  const greenhouses = new Set(
    [
      ...dayRecords.map((r) => r.greenhouseName),
      ...dayRounds.map((r) => r.greenhouseName),
    ].filter(Boolean),
  ).size;
  const varietiesWithIssues = new Set(
    dayRecords
      .map((r) => r.variety?.trim())
      .filter((v): v is string => Boolean(v && v !== "—")),
  ).size;
  const highSeverity = dayRecords.filter((r) => (r.rating ?? 0) >= 4).length;
  const scoutsFromActivity = new Set(
    [...dayRecords.map((r) => r.scoutName), ...dayRounds.map((r) => r.scoutName)],
  ).size;
  const activeToday = isToday
    ? dayRounds.filter((r) => r.status === "active").length
    : 0;
  const distance = dayRounds.reduce((s, r) => s + (r.distanceM ?? 0), 0);
  const coverageVals = dayRounds
    .map((r) => r.coveragePct)
    .filter((v): v is number => v != null);
  const avgCoverage = coverageVals.length
    ? Math.round(
        (coverageVals.reduce((a, b) => a + b, 0) / coverageVals.length) * 10,
      ) / 10
    : null;

  const byScout = new Map<
    string,
    { distance: number; greenhouses: Set<string>; observations: number; durationS: number }
  >();
  for (const round of dayRounds) {
    const cur = byScout.get(round.scoutName) ?? {
      distance: 0,
      greenhouses: new Set<string>(),
      observations: 0,
      durationS: 0,
    };
    cur.distance += round.distanceM ?? 0;
    cur.greenhouses.add(round.greenhouseName);
    cur.observations += round.stopCount;
    cur.durationS += round.durationS ?? 0;
    byScout.set(round.scoutName, cur);
  }
  for (const r of dayRecords) {
    const cur = byScout.get(r.scoutName) ?? {
      distance: 0,
      greenhouses: new Set<string>(),
      observations: 0,
      durationS: 0,
    };
    cur.greenhouses.add(r.greenhouseName);
    if (!dayRounds.some((round) => round.scoutName === r.scoutName)) {
      cur.observations += 1;
    }
    byScout.set(r.scoutName, cur);
  }

  return {
    scoutsActive: scoutsFromActivity || activeToday,
    distanceCovered: distance,
    varietiesWithIssues,
    greenhousesInspected: greenhouses,
    newObservations: dayRecords.length,
    highSeverity,
    coverage: avgCoverage,
    performance: Array.from(byScout.entries()).map(([name, v]) => ({
      name,
      distance: v.distance,
      greenhouses: v.greenhouses.size,
      observations: v.observations,
      avgMinutes:
        v.greenhouses.size > 0 && v.durationS > 0
          ? Math.round(v.durationS / 60 / v.greenhouses.size)
          : null,
    })),
  };
}

export function ScoutingKpiDashboard({
  liveUpdates = true,
  useWorkspaceFilters = false,
}: {
  liveUpdates?: boolean;
  /** Use admin/manager shell date + farm/site/variety filters (hide local date picker). */
  useWorkspaceFilters?: boolean;
}) {
  const poll = { enabled: liveUpdates };
  const sites = useManagerDashboardFilterStore((s) => s.sites);
  const farmId = useManagerDashboardFilterStore((s) => s.farmId);
  const greenhouseId = useManagerDashboardFilterStore((s) => s.greenhouseId);
  const varietyFilter = useManagerDashboardFilterStore((s) => s.variety);
  const dateYmds = useManagerDashboardFilterStore((s) => s.dateYmds);
  const dateFilterAll = useManagerDashboardFilterStore((s) => s.dateFilterAll);

  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()));
  const workspaceDayKeys = useMemo(() => {
    if (!useWorkspaceFilters) return null;
    if (dateFilterAll) return null;
    const days = Array.isArray(dateYmds) ? dateYmds : [];
    if (!days.length) return [todayDateYmd()];
    return days;
  }, [useWorkspaceFilters, dateFilterAll, dateYmds]);

  const effectiveSelectedDay = useWorkspaceFilters
    ? workspaceDayKeys?.length === 1
      ? startOfDay(new Date(`${workspaceDayKeys[0]!}T12:00:00`))
      : startOfDay(new Date())
    : selectedDay;

  const isToday = isSameDay(effectiveSelectedDay, new Date());
  const lookbackDays = useMemo(() => {
    if (useWorkspaceFilters && workspaceDayKeys && workspaceDayKeys.length > 0) {
      const oldest = workspaceDayKeys.reduce((a, b) => (a < b ? a : b));
      const from = startOfDay(new Date(`${oldest}T12:00:00`));
      return Math.min(90, Math.max(1, differenceInCalendarDays(startOfDay(new Date()), from) + 1));
    }
    return Math.min(
      90,
      Math.max(1, differenceInCalendarDays(startOfDay(new Date()), effectiveSelectedDay) + 1),
    );
  }, [useWorkspaceFilters, workspaceDayKeys, effectiveSelectedDay]);

  const filterSelection = useMemo(
    () => ({
      farmId,
      greenhouseId,
      variety: varietyFilter,
      dateYmds: workspaceDayKeys ?? (Array.isArray(dateYmds) ? dateYmds : []),
      dateFilterAll: useWorkspaceFilters ? dateFilterAll : false,
    }),
    [
      farmId,
      greenhouseId,
      varietyFilter,
      workspaceDayKeys,
      dateYmds,
      dateFilterAll,
      useWorkspaceFilters,
    ],
  );

  const matchesRecord = useCallback(
    (r: UnifiedScoutingRecord) =>
      matchesManagerDashboardFilters(sites, filterSelection, {
        greenhouseId: r.greenhouseId,
        greenhouseName: r.greenhouseName,
        cropType: r.variety?.trim() && r.variety !== "—" ? r.variety : null,
        createdAt: r.recordedAt,
      }),
    [sites, filterSelection],
  );

  const matchesRound = useCallback(
    (r: UnifiedScoutingRound) =>
      matchesManagerDashboardFilters(sites, filterSelection, {
        farmId: r.farmId,
        greenhouseId: r.greenhouseId,
        greenhouseName: r.greenhouseName,
        createdAt: r.startedAt,
      }),
    [sites, filterSelection],
  );

  const { records } = useScoutingData(lookbackDays, poll);
  const { rounds: recentRounds } = useScoutingRounds(120, poll);
  const demoRounds = useScoutingStore((s) => s.demoRounds);
  const demoRecords = useScoutingStore((s) => s.demoRecords);

  const [dayRoundsRemote, setDayRoundsRemote] = useState<UnifiedScoutingRound[] | null>(
    null,
  );

  useEffect(() => {
    if (!hasConfiguredBackend()) {
      setDayRoundsRemote(null);
      return;
    }
    if (useWorkspaceFilters && dateFilterAll) {
      setDayRoundsRemote(null);
      return;
    }
    let cancelled = false;
    let from = startOfDay(effectiveSelectedDay);
    let to = endOfDay(effectiveSelectedDay);
    if (useWorkspaceFilters && workspaceDayKeys && workspaceDayKeys.length > 1) {
      const sorted = [...workspaceDayKeys].sort();
      from = startOfDay(new Date(`${sorted[0]!}T12:00:00`));
      to = endOfDay(new Date(`${sorted[sorted.length - 1]!}T12:00:00`));
    }
    void listScoutingRoundsBetween(from, to, 200).then(({ data }) => {
      if (cancelled) return;
      setDayRoundsRemote(
        (data ?? []).map((r) => ({
          id: r.id,
          scoutName: r.users?.full_name ?? "Scout",
          farmId: r.farm_id,
          greenhouseName: r.greenhouses?.name ?? "—",
          greenhouseId: r.greenhouse_id,
          startedAt: r.started_at,
          endedAt: r.ended_at,
          status: r.status,
          stopCount: r.stop_count,
          distanceM: r.distance_m ?? 0,
          durationS: r.duration_s,
          coveragePct: r.coverage_pct,
        })),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [effectiveSelectedDay, useWorkspaceFilters, workspaceDayKeys, dateFilterAll]);

  const inKpiDayWindow = useCallback(
    (iso: string) => {
      if (useWorkspaceFilters && dateFilterAll) return true;
      if (useWorkspaceFilters && workspaceDayKeys && workspaceDayKeys.length > 0) {
        return workspaceDayKeys.some((ymd) => isOnCalendarDay(iso, ymd));
      }
      return isWithinDay(iso, effectiveSelectedDay);
    },
    [useWorkspaceFilters, dateFilterAll, workspaceDayKeys, effectiveSelectedDay],
  );

  const kpis = useMemo(() => {
    const toRecord = (r: (typeof demoRecords)[number]): UnifiedScoutingRecord => ({
      id: r.id,
      roundId: r.roundId ?? null,
      scoutName: r.scoutName,
      farmName: r.farmName,
      greenhouseName: r.greenhouseName,
      greenhouseId: r.greenhouseId,
      category: r.category,
      variety: r.variety,
      beds: r.beds,
      columnNo: r.columnNo,
      bayNo: r.bayNo,
      issueType: r.issueType,
      issue: r.issue,
      rating: r.rating,
      recordedAt: r.recordedAt,
      latitude: r.latitude,
      longitude: r.longitude,
      imageUrl: r.imageUrl ?? null,
    });
    const toRound = (r: (typeof demoRounds)[number]): UnifiedScoutingRound => ({
      id: r.id,
      scoutName: r.scoutName,
      farmId: r.farmId,
      greenhouseName: r.greenhouseName,
      greenhouseId: r.greenhouseId,
      startedAt: r.startedAt,
      endedAt: r.endedAt ?? null,
      status: r.status,
      stopCount: r.stopCount,
      distanceM: r.distanceM ?? 0,
      durationS: r.durationS ?? null,
      coveragePct: r.coveragePct ?? null,
    });

    if (!hasConfiguredBackend()) {
      const dayRecords = demoRecords
        .filter((r) => inKpiDayWindow(r.recordedAt))
        .map(toRecord)
        .filter((r) => !useWorkspaceFilters || matchesRecord(r));
      const dayRounds = demoRounds
        .filter((r) => inKpiDayWindow(r.startedAt))
        .map(toRound)
        .filter((r) => !useWorkspaceFilters || matchesRound(r));
      return computeKpis(dayRecords, dayRounds, isToday);
    }

    const dayRecords = records
      .filter((r) => inKpiDayWindow(r.recordedAt))
      .filter((r) => !useWorkspaceFilters || matchesRecord(r));
    const dayRounds = (
      dayRoundsRemote ??
      recentRounds.filter((r) => inKpiDayWindow(r.startedAt))
    ).filter((r) => !useWorkspaceFilters || matchesRound(r));

    return computeKpis(dayRecords, dayRounds, isToday);
  }, [
    records,
    recentRounds,
    demoRounds,
    demoRecords,
    isToday,
    dayRoundsRemote,
    inKpiDayWindow,
    useWorkspaceFilters,
    matchesRecord,
    matchesRound,
  ]);

  const cards = [
    {
      label: isToday ? "Scouts active" : "Scouts",
      value: String(kpis.scoutsActive),
    },
    { label: "Distance covered", value: formatDistance(kpis.distanceCovered) },
    { label: "Varieties with issues", value: String(kpis.varietiesWithIssues) },
    { label: "Greenhouses inspected", value: String(kpis.greenhousesInspected) },
    { label: "New observations", value: String(kpis.newObservations) },
    { label: "High severity", value: String(kpis.highSeverity) },
    {
      label: "Avg coverage",
      value: kpis.coverage != null ? `${kpis.coverage}%` : "—",
    },
  ];

  const dateInputValue = format(effectiveSelectedDay, "yyyy-MM-dd");
  const maxDate = format(new Date(), "yyyy-MM-dd");

  return (
    <section className="glass-card space-y-4 rounded-2xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            {useWorkspaceFilters
              ? "Today's scouting"
              : isToday
                ? "Today's scouting"
                : `Scouting · ${format(effectiveSelectedDay, "MMM d, yyyy")}`}
          </h2>
          <p className="text-sm text-muted-foreground">
            {useWorkspaceFilters
              ? `Snapshot for ${formatHeaderDatesSummary(
                  workspaceDayKeys ?? [],
                  dateFilterAll,
                ).toLowerCase()} — use header filters for farm, site, and variety.`
              : isToday
                ? "Live operational snapshot across Star scouting activity."
                : "Operational snapshot for the selected day."}
          </p>
        </div>
        {!useWorkspaceFilters ? (
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor="scouting-kpi-date"
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
            >
              <CalendarDays className="size-3.5" />
              Date
            </label>
            <input
              id="scouting-kpi-date"
              type="date"
              value={dateInputValue}
              max={maxDate}
              onChange={(e) => {
                const next = e.target.value;
                if (!next) return;
                setSelectedDay(startOfDay(new Date(`${next}T12:00:00`)));
              }}
              className={cn(
                "h-9 rounded-lg border border-border bg-background/80 px-3 text-sm",
                "text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              )}
            />
            {!isToday ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedDay(startOfDay(new Date()))}
              >
                Today
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-muted/30 px-3 py-3">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{c.value}</p>
          </div>
        ))}
      </div>

      {kpis.performance.length ? (
        <div>
          <p className="mb-2 text-sm font-medium">Scout performance</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="pb-2 font-medium">Scout</th>
                  <th className="pb-2 font-medium">Distance</th>
                  <th className="pb-2 font-medium">Greenhouses</th>
                  <th className="pb-2 font-medium">Observations</th>
                  <th className="pb-2 font-medium">Avg min / GH</th>
                </tr>
              </thead>
              <tbody>
                {kpis.performance.map((row) => (
                  <tr key={row.name} className="border-t border-border">
                    <td className="py-2 font-medium">{row.name}</td>
                    <td className="py-2">{formatDistance(row.distance)}</td>
                    <td className="py-2">{row.greenhouses}</td>
                    <td className="py-2">{row.observations}</td>
                    <td className="py-2">{row.avgMinutes != null ? `${row.avgMinutes}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
          No scouting activity recorded for{" "}
          {useWorkspaceFilters
            ? formatHeaderDatesSummary(workspaceDayKeys ?? [], dateFilterAll).toLowerCase()
            : format(effectiveSelectedDay, "MMMM d, yyyy")}
          .
        </p>
      )}
    </section>
  );
}
