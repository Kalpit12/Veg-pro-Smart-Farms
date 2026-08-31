"use client";

import type { AiScoutingReport } from "@/lib/scouting-ai-insights";
import { cn } from "@/lib/utils";

export function ScoutingAiInsightsPanel({ report }: { report: AiScoutingReport }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <p className="text-sm font-medium">Post-round insights</p>
      <p className="mt-1 text-xs text-muted-foreground">{report.summary}</p>
      <ul className="mt-3 space-y-2">
        {report.insights.map((insight) => (
          <li
            key={insight.title}
            className={cn(
              "rounded-lg border px-3 py-2 text-sm",
              insight.severity === "critical" &&
                "border-red-500/40 bg-red-500/10 text-red-950 dark:text-red-100",
              insight.severity === "warning" &&
                "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100",
              insight.severity === "info" && "border-border bg-background",
            )}
          >
            <p className="font-medium">{insight.title}</p>
            <p className="mt-0.5 text-xs opacity-90">{insight.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
