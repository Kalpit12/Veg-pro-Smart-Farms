"use client";

import { useMemo, useState } from "react";
import { format, formatDistanceToNow, subDays, isAfter } from "date-fns";
import { AlertTriangle } from "lucide-react";

import { AppSelect } from "@/components/ui/app-select";
import { Badge } from "@/components/ui/badge";
import {
  BEMACK_GREENHOUSES,
  bemackGreenhouseId,
  coverageGridForGreenhouse,
  greenhouseCellExists,
} from "@/lib/bemack-master-data";
import { buildCoverageModel } from "@/lib/scouting-coverage";
import { formatDistance, formatDuration } from "@/lib/route-metrics";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { useScoutingData, useScoutingRounds } from "@/hooks/use-scouting-data";
import { useScoutingStore } from "@/store/scouting-store";
import { cn } from "@/lib/utils";

type GridMode = "issues" | "coverage";

export function ScoutingCoveragePanel() {
  const { records } = useScoutingData(14);
  const { rounds } = useScoutingRounds(80);
  const demoRounds = useScoutingStore((s) => s.demoRounds);
  const demoRoutePoints = useScoutingStore((s) => s.demoRoutePoints);
  const [greenhouse, setGreenhouse] = useState("STGH01A");
  const [mode, setMode] = useState<GridMode>("coverage");

  const greenhouseId = bemackGreenhouseId(greenhouse);

  const coverage = useMemo(() => {
    const stops = records
      .filter((r) => r.greenhouseName === greenhouse)
      .map((r) => ({
        columnNo: r.columnNo,
        bayNo: r.bayNo,
        latitude: r.latitude,
        longitude: r.longitude,
      }));
    const routePoints = hasSupabaseEnv()
      ? []
      : demoRoutePoints
          .filter((p) => {
            const round = demoRounds.find((r) => r.id === p.roundId);
            return round?.greenhouseName === greenhouse;
          })
          .map((p) => ({ latitude: p.latitude, longitude: p.longitude }));

    return buildCoverageModel({
      greenhouseName: greenhouse,
      stops,
      routePoints,
      ...coverageGridForGreenhouse(greenhouse),
    });
  }, [records, greenhouse, demoRoutePoints, demoRounds]);

  const missedAlerts = useMemo(() => {
    const alerts: {
      greenhouse: string;
      lastInspectedAt: string | null;
      daysAgo: number | null;
      coveragePct: number | null;
    }[] = [];

    for (const gh of BEMACK_GREENHOUSES) {
      const ghRecords = records.filter((r) => r.greenhouseName === gh);
      const last = ghRecords
        .map((r) => new Date(r.recordedAt).getTime())
        .sort((a, b) => b - a)[0];
      const daysAgo = last != null ? Math.floor((Date.now() - last) / 86_400_000) : null;

      const recordCoverage = buildCoverageModel({
        greenhouseName: gh,
        stops: ghRecords.map((r) => ({
          columnNo: r.columnNo,
          bayNo: r.bayNo,
          latitude: r.latitude,
          longitude: r.longitude,
        })),
        routePoints: [],
        ...coverageGridForGreenhouse(gh),
      }).coveragePct;

      const latestRound = rounds
        .filter((r) => r.greenhouseName === gh && r.status === "completed")
        .sort(
          (a, b) =>
            new Date(b.endedAt ?? b.startedAt).getTime() -
            new Date(a.endedAt ?? a.startedAt).getTime(),
        )[0];

      const coveragePct = latestRound?.coveragePct ?? (ghRecords.length ? recordCoverage : null);
      const stale = daysAgo == null || daysAgo >= 3;
      const lowCoverage = coveragePct != null && coveragePct < 50;

      if (stale || lowCoverage) {
        alerts.push({
          greenhouse: gh,
          lastInspectedAt: last != null ? new Date(last).toISOString() : null,
          daysAgo,
          coveragePct,
        });
      }
    }
    return alerts.slice(0, 8);
  }, [records, rounds]);

  const dailyHistory = useMemo(() => {
    const since = subDays(new Date(), 7);

    if (hasSupabaseEnv()) {
      const recentRounds = rounds
        .filter((r) => isAfter(new Date(r.startedAt), since))
        .sort(
          (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
        )
        .slice(0, 12);
      if (recentRounds.length) {
        return recentRounds.map((r) => ({
          id: r.id,
          label: format(new Date(r.startedAt), "EEEE"),
          scout: r.scoutName,
          greenhouse: r.greenhouseName,
          distanceLabel: formatDistance(r.distanceM ?? 0),
          durationLabel: formatDuration(r.durationS),
          observations: r.stopCount,
          coverageLabel: r.coveragePct != null ? `${r.coveragePct}%` : "—",
        }));
      }

      const byDay = new Map<
        string,
        { scout: string; greenhouse: string; observations: number; date: string }
      >();
      for (const r of records) {
        const d = format(new Date(r.recordedAt), "yyyy-MM-dd");
        const key = `${d}|${r.scoutName}|${r.greenhouseName}`;
        const existing = byDay.get(key);
        if (existing) existing.observations += 1;
        else
          byDay.set(key, {
            date: d,
            scout: r.scoutName,
            greenhouse: r.greenhouseName,
            observations: 1,
          });
      }
      return Array.from(byDay.values())
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 12)
        .map((row) => ({
          id: `${row.date}-${row.scout}-${row.greenhouse}`,
          label: format(new Date(row.date), "EEEE"),
          scout: row.scout,
          greenhouse: row.greenhouse,
          distanceLabel: "—",
          durationLabel: "—",
          observations: row.observations,
          coverageLabel: "—",
        }));
    }

    const demoHistory = demoRounds
      .filter((r) => isAfter(new Date(r.startedAt), since))
      .sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
      );

    return demoHistory.map((r) => {
      const obs = useScoutingStore
        .getState()
        .demoRecords.filter((rec) => rec.roundId === r.id).length;
      return {
        id: r.id,
        label: format(new Date(r.startedAt), "EEEE"),
        scout: r.scoutName,
        greenhouse: r.greenhouseName,
        distanceLabel: formatDistance(r.distanceM ?? 0),
        durationLabel: formatDuration(
          r.durationS ??
            (r.endedAt
              ? Math.round(
                  (new Date(r.endedAt).getTime() - new Date(r.startedAt).getTime()) /
                    1000,
                )
              : null),
        ),
        observations: obs || r.stopCount,
        coverageLabel: r.coveragePct != null ? `${r.coveragePct}%` : "—",
      };
    });
  }, [demoRounds, records, rounds]);

  const { columns, bayRows } = useMemo(() => {
    const cols = Array.from({ length: coverage.maxColumn }, (_, i) => i + 1);
    const bays = Array.from({ length: coverage.maxBay }, (_, i) => i + 1);
    return { columns: cols, bayRows: bays };
  }, [coverage]);

  return (
    <section className="glass-card space-y-4 rounded-2xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Coverage & history</h2>
          <p className="text-sm text-muted-foreground">
            Column×bay footprint of scouting walks and missed areas.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:max-w-xl">
          <AppSelect
            aria-label="Coverage mode"
            className="min-w-[10rem] flex-1"
            size="sm"
            value={mode}
            onChange={(next) => setMode(next as GridMode)}
            options={[
              { value: "coverage", label: "Coverage grid" },
              { value: "issues", label: "Issue heat (see heat map)" },
            ]}
          />
          <AppSelect
            aria-label="Greenhouse"
            className="min-w-[8rem] flex-1"
            size="sm"
            value={greenhouse}
            onChange={setGreenhouse}
            options={BEMACK_GREENHOUSES.map((gh) => ({ value: gh, label: gh }))}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline">{greenhouse}</Badge>
        <p className="text-2xl font-semibold tabular-nums">{coverage.coveragePct}%</p>
        <p className="text-sm text-muted-foreground">
          {coverage.visitedCells} / {coverage.expectedCells} cells · id {greenhouseId.slice(0, 8)}
        </p>
      </div>

      {mode === "coverage" ? (
        <div className="overflow-x-auto">
          <table className="border-collapse text-xs">
            <thead>
              <tr>
                <th className="p-1 text-muted-foreground">Bay ↓ Col →</th>
                {columns.map((col) => (
                  <th key={col} className="p-1 font-medium text-muted-foreground">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bayRows.map((bay) => (
                <tr key={bay}>
                  <td className="p-1 text-muted-foreground">{bay}</td>
                  {columns.map((col) => {
                    const inLayout = greenhouseCellExists(greenhouse, col, bay);
                    const visited = inLayout && coverage.visited.has(`${col}-${bay}`);
                    return (
                      <td key={`${col}-${bay}`} className="p-0.5">
                        <span
                          className={cn(
                            "block size-4 rounded-sm",
                            !inLayout
                              ? "bg-transparent"
                              : visited
                                ? "bg-emerald-500"
                                : "bg-muted",
                          )}
                          title={
                            inLayout
                              ? `Col ${col} Bay ${bay}: ${visited ? "visited" : "missed"}`
                              : `No column ${col} in bay ${bay}`
                          }
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="size-3 rounded-sm bg-emerald-500" /> Visited
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-3 rounded-sm bg-muted" /> Missed
            </span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Use the Greenhouse heat map panel for issue severity coloring.
        </p>
      )}

      {missedAlerts.length ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Missed area alerts</p>
          <ul className="space-y-2">
            {missedAlerts.map((a) => (
              <li
                key={a.greenhouse}
                className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300" />
                <div>
                  <p className="font-medium">{a.greenhouse}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.daysAgo == null
                      ? "Never inspected in this window"
                      : `Last inspected ${a.daysAgo} day${a.daysAgo === 1 ? "" : "s"} ago`}
                    {a.lastInspectedAt
                      ? ` (${formatDistanceToNow(new Date(a.lastInspectedAt), { addSuffix: true })})`
                      : ""}
                    {a.coveragePct != null ? ` · Coverage ${a.coveragePct}%` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm font-medium">Daily route history</p>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {dailyHistory.length ? (
            dailyHistory.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">
                    {row.label} · {row.scout}
                  </p>
                  <p className="text-xs text-muted-foreground">{row.greenhouse}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>
                    {row.distanceLabel} · {row.durationLabel}
                  </p>
                  <p>
                    {row.observations} obs · Coverage {row.coverageLabel}
                  </p>
                </div>
              </li>
            ))
          ) : (
            <li className="px-3 py-4 text-sm text-muted-foreground">No recent rounds.</li>
          )}
        </ul>
      </div>
    </section>
  );
}
