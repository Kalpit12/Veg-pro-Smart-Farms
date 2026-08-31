"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
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
import type {
  GreenhouseConditionCompare,
  ImprovementTrendPoint,
} from "@/lib/greenhouse-condition";

type GreenhouseImprovementChartProps = {
  compare: GreenhouseConditionCompare;
  trend: ImprovementTrendPoint[];
};

export function GreenhouseImprovementChart({
  compare,
  trend,
}: GreenhouseImprovementChartProps) {
  const chartData = useMemo(() => trend, [trend]);

  return (
    <section className="glass-card rounded-2xl p-4">
      <header className="mb-4">
        <h2 className="text-sm font-semibold">Improvement cycle</h2>
        <p className="text-xs text-muted-foreground">
          Weekly health and severity trend for {compare.greenhouse} over the last{" "}
          {3} months — upward health and lower severity show progress.
        </p>
      </header>

      <div className="chart-surface">
        <ResponsiveChart height={256} className="chart-surface">
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={CHART_GRID_STROKE} strokeDasharray="4 6" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={CHART_AXIS_TICK}
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              yAxisId="health"
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tick={CHART_AXIS_TICK}
              width={36}
              label={{
                value: "Health",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 10, fill: "currentColor" },
              }}
            />
            <YAxis
              yAxisId="severity"
              orientation="right"
              domain={[1, 5]}
              tickLine={false}
              axisLine={false}
              tick={CHART_AXIS_TICK}
              width={36}
              label={{
                value: "Severity",
                angle: 90,
                position: "insideRight",
                style: { fontSize: 10, fill: "currentColor" },
              }}
            />
            <Tooltip content={(props) => <VegProChartTooltip {...props} />} />
            <Legend wrapperStyle={CHART_LEGEND_STYLE} iconType="circle" />
            <ReferenceLine
              yAxisId="health"
              y={compare.baseline.healthScore}
              stroke="#94a3b8"
              strokeDasharray="6 4"
              label={{
                value: "3 mo ago",
                position: "insideTopLeft",
                fontSize: 10,
                fill: "currentColor",
              }}
            />
            <Line
              yAxisId="health"
              type="monotone"
              dataKey="healthScore"
              name="Health score"
              stroke="var(--chart-2)"
              strokeWidth={2.5}
              dot={{ r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
            <Line
              yAxisId="severity"
              type="monotone"
              dataKey="avgSeverity"
              name="Avg severity"
              stroke="var(--chart-1)"
              strokeWidth={2.5}
              dot={{ r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveChart>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
        <p>
          <span className="font-medium text-foreground">Start: </span>
          {compare.baseline.healthScore} health · severity{" "}
          {compare.baseline.avgSeverity}
        </p>
        <p>
          <span className="font-medium text-foreground">Now: </span>
          {compare.current.healthScore} health · severity{" "}
          {compare.current.avgSeverity}
        </p>
        <p>
          <span className="font-medium text-emerald-700 dark:text-emerald-300">
            Net: +{compare.healthDelta} health
          </span>
          {compare.severityDelta > 0 ? (
            <span> · −{compare.severityDelta} severity</span>
          ) : null}
        </p>
      </div>
    </section>
  );
}
