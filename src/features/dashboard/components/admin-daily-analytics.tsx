"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ResponsiveChart } from "@/components/charts/responsive-chart";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  CHART_LEGEND_STYLE,
} from "@/features/dashboard/components/chart-theme";
import { VegProChartTooltip } from "@/features/dashboard/components/vegpro-chart-tooltip";
import { useToast } from "@/hooks/use-toast";
import { getDemoHotspots } from "@/lib/demo-field-data";
import { hasConfiguredBackend } from "@/lib/data-backend";
import {
  getAdminDailyAnalytics,
  type AdminDailyAnalytics,
} from "@/services/supabase/dashboard-service";

const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "#94a3b8",
];

function demoAnalytics(): AdminDailyAnalytics {
  const active = getDemoHotspots().filter((h) => h.status === "active");
  const pestMap = new Map<string, number>();
  for (const row of active) {
    pestMap.set(row.pest_type, (pestMap.get(row.pest_type) ?? 0) + 1);
  }
  return {
    pestMix: Array.from(pestMap, ([name, value]) => ({ name, value })).sort(
      (a, b) => b.value - a.value,
    ),
    severityMix: [1, 2, 3, 4, 5].map((level) => ({
      name: `${level}/5`,
      value: active.filter((h) => h.severity === level).length,
    })),
    issueTypeMix: [
      { name: "Pest", value: 18 },
      { name: "Disease", value: 7 },
    ],
    scoutingByHouse: [
      { greenhouse: "STGH01A", stops: 14 },
      { greenhouse: "STGH05A", stops: 11 },
      { greenhouse: "STGH03A", stops: 9 },
      { greenhouse: "STGH10A", stops: 8 },
      { greenhouse: "STGH07B", stops: 6 },
      { greenhouse: "STGH15C", stops: 5 },
    ],
  };
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="glass-card flex h-full flex-col rounded-2xl p-4">
      <header className="mb-3">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </header>
      {children}
    </section>
  );
}

export function AdminDailyAnalytics({
  section = "all",
}: {
  section?: "all" | "mix" | "houses";
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdminDailyAnalytics>(demoAnalytics);

  const load = useCallback(async () => {
    if (!hasConfiguredBackend()) {
      setData(demoAnalytics());
      setLoading(false);
      return;
    }
    try {
      setData(await getAdminDailyAnalytics());
    } catch (e) {
      toast({
        title: "Analytics unavailable",
        description: e instanceof Error ? e.message : "Could not load charts.",
        tone: "error",
      });
      setData(demoAnalytics());
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const pestTotal = useMemo(
    () => data.pestMix.reduce((sum, row) => sum + row.value, 0),
    [data.pestMix],
  );
  const typeTotal = useMemo(
    () => data.issueTypeMix.reduce((sum, row) => sum + row.value, 0),
    [data.issueTypeMix],
  );
  const hasSeverity = data.severityMix.some((row) => row.value > 0);
  const hasHouses = data.scoutingByHouse.some((row) => row.stops > 0);

  const mixCharts = (
      <div className="grid gap-4 sm:grid-cols-3">
        <ChartCard title="Open issues by pest" subtitle="Active hotspots right now">
          {pestTotal > 0 ? (
            <ResponsiveChart height={176} className="chart-surface">
              <PieChart>
                <Pie
                  data={data.pestMix}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={64}
                  paddingAngle={2}
                >
                  {data.pestMix.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={(props) => <VegProChartTooltip {...props} />} />
                <Legend wrapperStyle={CHART_LEGEND_STYLE} iconType="circle" />
              </PieChart>
            </ResponsiveChart>
          ) : (
            <p className="flex h-[176px] items-center justify-center text-sm text-muted-foreground">
              No open hotspots.
            </p>
          )}
        </ChartCard>

        <ChartCard title="Severity mix" subtitle="Open hotspot ratings 1–5">
          {hasSeverity ? (
            <ResponsiveChart height={176} className="chart-surface">
              <BarChart data={data.severityMix} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={CHART_GRID_STROKE} strokeDasharray="4 6" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={CHART_AXIS_TICK} />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={CHART_AXIS_TICK}
                  width={28}
                />
                <Tooltip content={(props) => <VegProChartTooltip {...props} />} />
                <Bar dataKey="value" name="Hotspots" radius={[6, 6, 0, 0]} fill="var(--chart-1)" />
              </BarChart>
            </ResponsiveChart>
          ) : (
            <p className="flex h-[176px] items-center justify-center text-sm text-muted-foreground">
              No severity data yet.
            </p>
          )}
        </ChartCard>

        <ChartCard title="Scout mix" subtitle="Pest vs disease stops, last 7 days">
          {typeTotal > 0 ? (
            <ResponsiveChart height={176} className="chart-surface">
              <PieChart>
                <Pie
                  data={data.issueTypeMix}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={64}
                  paddingAngle={3}
                >
                  {data.issueTypeMix.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={index === 0 ? "var(--chart-2)" : "var(--chart-1)"}
                    />
                  ))}
                </Pie>
                <Tooltip content={(props) => <VegProChartTooltip {...props} />} />
                <Legend wrapperStyle={CHART_LEGEND_STYLE} iconType="circle" />
              </PieChart>
            </ResponsiveChart>
          ) : (
            <p className="flex h-[176px] items-center justify-center text-sm text-muted-foreground">
              No scouting this week.
            </p>
          )}
        </ChartCard>
      </div>
  );

  const housesChart = (
      <ChartCard
        title="Scouting by greenhouse"
        subtitle="Top houses by stops in the last 7 days"
      >
        {hasHouses ? (
          <ResponsiveChart height={220} className="chart-surface">
            <BarChart
              data={data.scoutingByHouse}
              layout="vertical"
              margin={{ top: 4, right: 12, left: 8, bottom: 0 }}
            >
              <CartesianGrid stroke={CHART_GRID_STROKE} strokeDasharray="4 6" horizontal={false} />
              <XAxis
                type="number"
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={CHART_AXIS_TICK}
              />
              <YAxis
                type="category"
                dataKey="greenhouse"
                width={72}
                tickLine={false}
                axisLine={false}
                tick={CHART_AXIS_TICK}
              />
              <Tooltip content={(props) => <VegProChartTooltip {...props} />} />
              <Bar dataKey="stops" name="Stops" radius={[0, 6, 6, 0]} fill="var(--chart-3)" />
            </BarChart>
          </ResponsiveChart>
        ) : (
          <p className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
            No greenhouse scouting this week.
          </p>
        )}
      </ChartCard>
  );

  if (loading) {
    if (section === "houses") return <Skeleton className="h-56 rounded-2xl" />;
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-52 rounded-2xl" />
        <Skeleton className="h-52 rounded-2xl" />
        <Skeleton className="h-52 rounded-2xl" />
      </div>
    );
  }

  if (section === "mix") return mixCharts;
  if (section === "houses") return housesChart;

  return (
    <div className="space-y-4">
      {mixCharts}
      {housesChart}
    </div>
  );
}
