"use client";

import {
  differenceInCalendarDays,
  endOfDay,
  format,
  isSameDay,
  startOfDay,
} from "date-fns";
import { CalendarDays } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
  const farms = new Set(dayRecords.map((r) => r.farmName)).size;
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
    farmsCompleted: farms,
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
}: {
  liveUpdates?: boolean;
}) {
  const poll = { enabled: liveUpdates };
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()));
  const isToday = isSameDay(selectedDay, new Date());
  const lookbackDays = Math.min(
    90,
    Math.max(1, differenceInCalendarDays(startOfDay(new Date()), selectedDay) + 1),
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
    let cancelled = false;
    const from = startOfDay(selectedDay);
    const to = endOfDay(selectedDay);
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
  }, [selectedDay]);

  const kpis = useMemo(() => {
    if (!hasConfiguredBackend()) {
      const dayRounds = demoRounds.filter((r) => isWithinDay(r.startedAt, selectedDay));
      const dayRecords = demoRecords.filter((r) => isWithinDay(r.recordedAt, selectedDay));
      return computeKpis(
        dayRecords.map((r) => ({
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
        })),
        dayRounds.map((r) => ({
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
        })),
        isToday,
      );
    }

    const dayRecords = records.filter((r) => isWithinDay(r.recordedAt, selectedDay));
    const dayRounds =
      dayRoundsRemote ??
      recentRounds.filter((r) => isWithinDay(r.startedAt, selectedDay));

    return computeKpis(dayRecords, dayRounds, isToday);
  }, [
    records,
    recentRounds,
    demoRounds,
    demoRecords,
    selectedDay,
    isToday,
    dayRoundsRemote,
  ]);

  const cards = [
    {
      label: isToday ? "Scouts active" : "Scouts",
      value: String(kpis.scoutsActive),
    },
    { label: "Distance covered", value: formatDistance(kpis.distanceCovered) },
    { label: "Farms completed", value: String(kpis.farmsCompleted) },
    { label: "Greenhouses inspected", value: String(kpis.greenhousesInspected) },
    { label: "New observations", value: String(kpis.newObservations) },
    { label: "High severity", value: String(kpis.highSeverity) },
    {
      label: "Avg coverage",
      value: kpis.coverage != null ? `${kpis.coverage}%` : "—",
    },
  ];

  const dateInputValue = format(selectedDay, "yyyy-MM-dd");
  const maxDate = format(new Date(), "yyyy-MM-dd");

  return (
    <section className="glass-card space-y-4 rounded-2xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            {isToday ? "Today's scouting" : `Scouting · ${format(selectedDay, "MMM d, yyyy")}`}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isToday
              ? "Live operational snapshot across Star scouting activity."
              : "Operational snapshot for the selected day."}
          </p>
        </div>
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
          No scouting activity recorded for {format(selectedDay, "MMMM d, yyyy")}.
        </p>
      )}
    </section>
  );
}
