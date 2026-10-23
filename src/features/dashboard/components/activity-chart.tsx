"use client";

import { format } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ResponsiveChart } from "@/components/charts/responsive-chart";

import {
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  CHART_LEGEND_STYLE,
} from "@/features/dashboard/components/chart-theme";
import { VegProChartTooltip } from "@/features/dashboard/components/vegpro-chart-tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { hasConfiguredBackend } from "@/lib/data-backend";
import { useManagerDashboardFilterApply } from "@/hooks/use-manager-dashboard-filter-apply";
import {
  calendarDayWindow,
  isOnCalendarDay,
  matchesManagerDashboardFilters,
} from "@/lib/manager-dashboard-filters";
import { getWeeklyInfestationTrends } from "@/services/supabase/dashboard-service";
import { listHotspots } from "@/services/supabase/infestation-service";
import { listScoutingRecords } from "@/services/supabase/scouting-service";
import { listSprays } from "@/services/supabase/spray-service";

const demoData = [
  { day: "Mon", reports: 4, sprays: 6, scouting: 12 },
  { day: "Tue", reports: 5, sprays: 8, scouting: 15 },
  { day: "Wed", reports: 3, sprays: 7, scouting: 9 },
  { day: "Thu", reports: 6, sprays: 9, scouting: 18 },
  { day: "Fri", reports: 4, sprays: 11, scouting: 14 },
  { day: "Sat", reports: 2, sprays: 4, scouting: 6 },
  { day: "Sun", reports: 1, sprays: 3, scouting: 4 },
];

export function ActivityChart({
  managerDashboardFilters = false,
}: {
  managerDashboardFilters?: boolean;
}) {
  const { toast } = useToast();
  const filterCtx = useManagerDashboardFilterApply(managerDashboardFilters);
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState(demoData);

  const load = useCallback(async () => {
    if (!hasConfiguredBackend()) {
      setSeries(demoData);
      setLoading(false);
      return;
    }

    try {
      if (managerDashboardFilters) {
        const [hotRes, sprayRes, scoutRes] = await Promise.all([
          listHotspots(200),
          listSprays(200),
          listScoutingRecords(200),
        ]);
        const scope = {
          farmId: filterCtx.farmId,
          greenhouseId: filterCtx.greenhouseId,
          variety: filterCtx.variety,
          dateYmds: filterCtx.dateYmds,
          dateFilterAll: true,
        };
        const inScope = (item: Parameters<typeof filterCtx.matches>[0]) =>
          matchesManagerDashboardFilters(filterCtx.sites, scope, item);

        const reports = (hotRes.data ?? []).filter((h) => {
          const row = h as {
            farm_id: string;
            greenhouse_id: string | null;
            greenhouses?: { name?: string; crop_type?: string } | null;
            created_at: string;
          };
          return inScope({
            farmId: row.farm_id,
            greenhouseId: row.greenhouse_id,
            greenhouseName: row.greenhouses?.name,
            cropType: row.greenhouses?.crop_type ?? null,
            createdAt: row.created_at,
          });
        });
        const sprays = (sprayRes.data ?? []).filter((s) => {
          const row = s as {
            farm_id: string;
            greenhouse_id: string | null;
            greenhouses?: { name?: string; crop_type?: string } | null;
            created_at: string;
          };
          return inScope({
            farmId: row.farm_id,
            greenhouseId: row.greenhouse_id,
            greenhouseName: row.greenhouses?.name,
            cropType: row.greenhouses?.crop_type ?? null,
            createdAt: row.created_at,
          });
        });
        const scouting = (scoutRes.data ?? []).filter((r) => {
          const row = r as {
            farm_id: string;
            greenhouse_id: string;
            greenhouses?: { name?: string; crop_type?: string } | null;
            crop_varieties?: { name?: string } | null;
            recorded_at: string;
          };
          return inScope({
            farmId: row.farm_id,
            greenhouseId: row.greenhouse_id,
            greenhouseName: row.greenhouses?.name,
            cropType: row.crop_varieties?.name ?? row.greenhouses?.crop_type ?? null,
            createdAt: row.recorded_at,
          });
        });

        const dateKeys = filterCtx.dateFilterAll
          ? Array.from({ length: 7 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (6 - i));
              return format(d, "yyyy-MM-dd");
            })
          : [...filterCtx.dateYmds].sort();

        setSeries(
          dateKeys.map((ymd) => {
            const { from } = calendarDayWindow(ymd);
            const count = (rows: { created_at?: string; recorded_at?: string }[]) =>
              rows.filter((row) =>
                isOnCalendarDay(row.created_at ?? row.recorded_at ?? "", ymd),
              ).length;
            return {
              day: format(from, "EEE d MMM"),
              reports: count(reports as { created_at: string }[]),
              sprays: count(sprays as { created_at: string }[]),
              scouting: count(scouting as { recorded_at: string }[]),
            };
          }),
        );
      } else {
      const trends = await getWeeklyInfestationTrends();
      setSeries(
        trends.reports.map((point, index) => ({
          day: point.day,
          reports: point.value,
          sprays: trends.sprays[index]?.value ?? 0,
          scouting: trends.scouting[index]?.value ?? 0,
        })),
      );
      }
    } catch (e) {
      toast({
        title: "Trend data unavailable",
        description: e instanceof Error ? e.message : "Unknown error",
        tone: "error",
      });
      setSeries(demoData);
    } finally {
      setLoading(false);
    }
  }, [
    toast,
    managerDashboardFilters,
    filterCtx.farmId,
    filterCtx.greenhouseId,
    filterCtx.variety,
    filterCtx.dateYmds,
    filterCtx.dateFilterAll,
    filterCtx.sites,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasData = useMemo(
    () => series.some((point) => point.reports > 0 || point.sprays > 0 || point.scouting > 0),
    [series],
  );

  return (
    <section className="glass-card rounded-2xl p-4">
      <header className="mb-4">
        <h3 className="text-base font-semibold">
          {managerDashboardFilters && !filterCtx.dateFilterAll
            ? "Selected dates"
            : "Last 7 days"}
        </h3>
        <p className="text-xs text-muted-foreground">Reports, sprays, and scouting stops</p>
      </header>
      <div className="chart-surface">
        {loading ? (
          <Skeleton className="h-56 w-full" />
        ) : hasData ? (
          <ResponsiveChart height={224} className="chart-surface">
            <LineChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_GRID_STROKE} strokeDasharray="4 6" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={CHART_AXIS_TICK} />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={CHART_AXIS_TICK}
                width={32}
              />
              <Tooltip content={(props) => <VegProChartTooltip {...props} />} />
              <Legend wrapperStyle={CHART_LEGEND_STYLE} iconType="circle" />
              <Line
                type="monotone"
                dataKey="reports"
                name="Reports"
                stroke="var(--chart-1)"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="sprays"
                name="Sprays"
                stroke="var(--chart-2)"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="scouting"
                name="Scouting"
                stroke="var(--chart-3)"
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveChart>
        ) : (
          <p className="flex h-56 items-center justify-center rounded-xl border border-dashed border-border/80 text-sm text-muted-foreground">
            No data yet for the last seven days.
          </p>
        )}
      </div>
    </section>
  );
}
