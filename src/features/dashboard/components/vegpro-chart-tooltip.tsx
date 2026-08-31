"use client";

import type { TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

import { formatChartSeriesName } from "@/features/dashboard/components/chart-theme";
import { cn } from "@/lib/utils";

export function VegProChartTooltip(
  props: TooltipContentProps<ValueType, NameType>,
) {
  const { active, payload, label } = props;
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-tooltip rounded-xl border border-border/80 bg-card/95 px-3 py-2.5 shadow-lg backdrop-blur-sm">
      {label ? (
        <p className="font-chart-display text-sm font-semibold tracking-tight text-foreground">
          {String(label)}
        </p>
      ) : null}
      <ul className={cn("space-y-1", label ? "mt-2" : undefined)}>
        {payload.map((entry) => {
          if (!entry) return null;
          const name = formatChartSeriesName(String(entry.name ?? entry.dataKey ?? "Value"));
          const value = entry.value ?? "—";

          return (
            <li
              key={`${entry.dataKey ?? entry.name}-${String(value)}`}
              className="flex items-center justify-between gap-4 text-xs"
            >
              <span className="inline-flex items-center gap-2 font-chart-label font-semibold tracking-[0.08em] uppercase">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: entry.color ?? "var(--chart-1)" }}
                />
                {name}
              </span>
              <span className="font-chart-data text-sm font-medium tabular-nums text-foreground">
                {value}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
