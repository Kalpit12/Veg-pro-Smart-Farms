"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ResponsiveChart } from "@/components/charts/responsive-chart";

import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  CHART_LEGEND_STYLE,
} from "@/features/dashboard/components/chart-theme";
import { VegProChartTooltip } from "@/features/dashboard/components/vegpro-chart-tooltip";
import { useHotspotResolutionRefs } from "@/hooks/use-hotspot-resolution";
import {
  getIssueResolutionStatus,
  filterUnresolvedScoutingRecords,
} from "@/lib/issue-resolution";
import {
  mergeGreenhouseChartRows,
  pressureByGreenhouse,
  pressureByVariety,
} from "@/lib/demo-scouting-pressure";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { getScoutingPressureByGreenhouse } from "@/services/supabase/scouting-service";
import { useScoutingStore } from "@/store/scouting-store";

const DISEASE_COLOR = "var(--chart-1)";
const PEST_COLOR = "#f59e0b";

function roundRating(value: number) {
  return Math.round(value * 10) / 10;
}

type TopIssueRow = {
  greenhouse: string;
  variety: string;
  issue: string;
  avgRating: number;
  status: "resolved" | "pending";
};

export function ScoutingPressurePanel() {
  const demoRecords = useScoutingStore((s) => s.demoRecords);
  const resolutionHotspots = useHotspotResolutionRefs();
  const [loading, setLoading] = useState(hasSupabaseEnv());
  const [remoteGh, setRemoteGh] = useState<
    { greenhouse: string; diseasePressure: number; pestPressure: number }[]
  >([]);
  const [remoteVar, setRemoteVar] = useState<
    { greenhouse: string; variety: string; issue: string; avgRating: number }[]
  >([]);

  const loadRemote = useCallback(async () => {
    if (!hasSupabaseEnv()) return;
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const { data } = await getScoutingPressureByGreenhouse(since);
    const byGh = new Map<string, { disease: number[]; pest: number[] }>();
    for (const row of data) {
      const g = byGh.get(row.greenhouse) ?? { disease: [], pest: [] };
      if (row.issue_type === "disease") g.disease.push(row.avg_rating);
      else g.pest.push(row.avg_rating);
      byGh.set(row.greenhouse, g);
    }
    setRemoteGh(
      Array.from(byGh.entries()).map(([greenhouse, v]) => ({
        greenhouse,
        diseasePressure: v.disease.length
          ? roundRating(v.disease.reduce((a, b) => a + b, 0) / v.disease.length)
          : 0,
        pestPressure: v.pest.length
          ? roundRating(v.pest.reduce((a, b) => a + b, 0) / v.pest.length)
          : 0,
      })),
    );
    setRemoteVar(
      data
        .map((r) => ({
          greenhouse: r.greenhouse,
          variety: r.variety,
          issue: r.issue_name,
          avgRating: roundRating(r.avg_rating),
        }))
        .sort((a, b) => b.avgRating - a.avgRating)
        .slice(0, 8),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadRemote();
  }, [loadRemote]);

  const ghPressure = useMemo(() => {
    const activeDemo = filterUnresolvedScoutingRecords(demoRecords, resolutionHotspots);
    const raw =
      hasSupabaseEnv() && remoteGh.length
        ? remoteGh
        : pressureByGreenhouse(activeDemo).map((r) => ({
            greenhouse: r.greenhouse,
            diseasePressure: r.diseasePressure,
            pestPressure: r.pestPressure,
          }));
    return mergeGreenhouseChartRows(raw);
  }, [demoRecords, remoteGh, resolutionHotspots]);

  const varietyRows = useMemo((): TopIssueRow[] => {
    const withStatus = (
      rows: { greenhouse: string; variety: string; issue: string; avgRating: number }[],
    ): TopIssueRow[] =>
      rows.map((row) => ({
        ...row,
        status: getIssueResolutionStatus(row.greenhouse, row.issue, resolutionHotspots),
      }));

    if (hasSupabaseEnv() && remoteVar.length) {
      return withStatus(remoteVar);
    }

    return withStatus(
      pressureByVariety(demoRecords)
        .sort((a, b) => b.avgRating - a.avgRating)
        .slice(0, 8)
        .map((row) => ({
          greenhouse: row.greenhouse,
          variety: row.variety,
          issue: row.issue,
          avgRating: row.avgRating,
        })),
    );
  }, [demoRecords, remoteVar, resolutionHotspots]);

  const chartHeight = Math.min(520, Math.max(280, ghPressure.length * 30));
  const hasChartData = ghPressure.some((row) => row.disease > 0 || row.pest > 0);

  if (loading && hasSupabaseEnv()) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-lg font-semibold">Issue levels</h2>
        <p className="text-sm text-muted-foreground">Avg rating by greenhouse (last 30 days).</p>
      </header>

      <div className="glass-card rounded-2xl p-4">
        <h3 className="mb-3 text-sm font-semibold">By greenhouse</h3>
        <div className="chart-surface w-full">
          {hasChartData ? (
            <ResponsiveChart height={chartHeight} className="chart-surface">
              <BarChart
                layout="vertical"
                data={ghPressure}
                margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
              >
                <CartesianGrid stroke={CHART_GRID_STROKE} horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 5]}
                  tickCount={6}
                  tickLine={false}
                  axisLine={false}
                  tick={CHART_AXIS_TICK}
                />
                <YAxis
                  type="category"
                  dataKey="greenhouse"
                  tickLine={false}
                  axisLine={false}
                  tick={CHART_AXIS_TICK}
                  width={76}
                />
                <Tooltip content={(props) => <VegProChartTooltip {...props} />} />
                <Legend wrapperStyle={CHART_LEGEND_STYLE} iconType="circle" />
                <Bar
                  dataKey="disease"
                  name="Disease"
                  fill={DISEASE_COLOR}
                  radius={[0, 4, 4, 0]}
                  barSize={10}
                />
                <Bar
                  dataKey="pest"
                  name="Pest"
                  fill={PEST_COLOR}
                  radius={[0, 4, 4, 0]}
                  barSize={10}
                />
              </BarChart>
            </ResponsiveChart>
          ) : (
            <p className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
              No scouting data in the last 30 days.
            </p>
          )}
        </div>
      </div>

      {varietyRows.length ? (
        <div className="glass-card overflow-x-auto rounded-2xl p-4">
          <h3 className="mb-3 text-sm font-semibold">Top issues</h3>
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="py-2 pr-3">Greenhouse</th>
                <th className="py-2 pr-3">Variety</th>
                <th className="py-2 pr-3">Issue</th>
                <th className="py-2 pr-3">Rating</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {varietyRows.map((row, i) => (
                <tr key={i} className="border-b border-border/60">
                  <td className="py-2 pr-3 font-medium">{row.greenhouse}</td>
                  <td className="py-2 pr-3">{row.variety || "—"}</td>
                  <td className="py-2 pr-3">{row.issue || "—"}</td>
                  <td className="py-2 pr-3 tabular-nums">{row.avgRating}/5</td>
                  <td className="py-2">
                    <Badge variant={row.status === "resolved" ? "success" : "warning"}>
                      {row.status === "resolved" ? "Resolved" : "Pending"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
