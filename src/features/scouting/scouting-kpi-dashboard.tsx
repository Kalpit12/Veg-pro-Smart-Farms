"use client";

import { useMemo } from "react";
import { startOfDay } from "date-fns";

import { useScoutingData } from "@/hooks/use-scouting-data";
import { formatDistance } from "@/lib/route-metrics";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { useScoutingStore } from "@/store/scouting-store";

export function ScoutingKpiDashboard() {
  const { records } = useScoutingData(1);
  const demoRounds = useScoutingStore((s) => s.demoRounds);
  const demoRecords = useScoutingStore((s) => s.demoRecords);

  const kpis = useMemo(() => {
    const todayStart = startOfDay(new Date()).getTime();

    if (!hasSupabaseEnv()) {
      const todayRounds = demoRounds.filter(
        (r) => new Date(r.startedAt).getTime() >= todayStart - 7 * 86_400_000,
      );
      const active = demoRounds.filter((r) => r.status === "active").length;
      const distance = todayRounds.reduce((s, r) => s + (r.distanceM ?? 0), 0);
      const greenhouses = new Set(todayRounds.map((r) => r.greenhouseName)).size;
      const farms = new Set(todayRounds.map((r) => r.farmId)).size;
      const observations = demoRecords.filter(
        (r) => new Date(r.recordedAt).getTime() >= todayStart - 7 * 86_400_000,
      );
      const highSeverity = observations.filter((r) => (r.rating ?? 0) >= 4).length;
      const coverageVals = todayRounds
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
      for (const r of todayRounds) {
        const cur = byScout.get(r.scoutName) ?? {
          distance: 0,
          greenhouses: new Set<string>(),
          observations: 0,
          durationS: 0,
        };
        cur.distance += r.distanceM ?? 0;
        cur.greenhouses.add(r.greenhouseName);
        cur.observations += r.stopCount;
        cur.durationS += r.durationS ?? 0;
        byScout.set(r.scoutName, cur);
      }

      return {
        scoutsActive: active || byScout.size,
        distanceCovered: distance,
        farmsCompleted: farms,
        greenhousesInspected: greenhouses,
        newObservations: observations.length,
        highSeverity,
        coverage: avgCoverage,
        performance: Array.from(byScout.entries()).map(([name, v]) => ({
          name,
          distance: v.distance,
          greenhouses: v.greenhouses.size,
          observations: v.observations,
          avgMinutes:
            v.greenhouses.size > 0
              ? Math.round(v.durationS / 60 / v.greenhouses.size)
              : null,
        })),
      };
    }

    const todayRecords = records.filter(
      (r) => new Date(r.recordedAt).getTime() >= todayStart,
    );
    const greenhouses = new Set(todayRecords.map((r) => r.greenhouseName)).size;
    const farms = new Set(todayRecords.map((r) => r.farmName)).size;
    const highSeverity = todayRecords.filter((r) => (r.rating ?? 0) >= 4).length;
    const scouts = new Set(todayRecords.map((r) => r.scoutName)).size;

    const byScout = new Map<string, { greenhouses: Set<string>; observations: number }>();
    for (const r of todayRecords) {
      const cur = byScout.get(r.scoutName) ?? {
        greenhouses: new Set<string>(),
        observations: 0,
      };
      cur.greenhouses.add(r.greenhouseName);
      cur.observations += 1;
      byScout.set(r.scoutName, cur);
    }

    return {
      scoutsActive: scouts,
      distanceCovered: 0,
      farmsCompleted: farms,
      greenhousesInspected: greenhouses,
      newObservations: todayRecords.length,
      highSeverity,
      coverage: null as number | null,
      performance: Array.from(byScout.entries()).map(([name, v]) => ({
        name,
        distance: 0,
        greenhouses: v.greenhouses.size,
        observations: v.observations,
        avgMinutes: null as number | null,
      })),
    };
  }, [records, demoRounds, demoRecords]);

  const cards = [
    { label: "Scouts active", value: String(kpis.scoutsActive) },
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

  return (
    <section className="glass-card space-y-4 rounded-2xl p-4">
      <div>
        <h2 className="text-lg font-semibold">Today&apos;s scouting</h2>
        <p className="text-sm text-muted-foreground">
          Live operational snapshot across Star scouting activity.
        </p>
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
      ) : null}
    </section>
  );
}
