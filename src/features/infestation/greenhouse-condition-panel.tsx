"use client";

import { format } from "date-fns";
import { ArrowDown, ArrowRight, ArrowUp, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { GreenhouseConditionCompare } from "@/lib/greenhouse-condition";

function HealthBar({ score }: { score: number }) {
  const tone =
    score >= 70 ? "bg-emerald-500" : score >= 45 ? "bg-amber-500" : "bg-red-500";
  return (
    <div
      className={`h-full rounded-full transition-all ${tone}`}
      style={{ width: `${score}%` }}
    />
  );
}

function ConditionCard({
  snapshot,
}: {
  snapshot: GreenhouseConditionCompare["baseline"];
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/70 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {snapshot.periodLabel}
        </p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(snapshot.recordedAt), "MMM d, yyyy")}
        </p>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums">
        {snapshot.healthScore}
        <span className="text-sm font-normal text-muted-foreground"> / 100 health</span>
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <HealthBar score={snapshot.healthScore} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Avg severity</dt>
          <dd className="font-medium">{snapshot.avgSeverity}/5</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Active issues</dt>
          <dd className="font-medium">{snapshot.activeIssues}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Resolved</dt>
          <dd className="font-medium">{snapshot.resolvedIssues}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Primary issue</dt>
          <dd className="font-medium">{snapshot.primaryIssue}</dd>
        </div>
      </dl>
      <p className="mt-3 text-sm text-muted-foreground">{snapshot.summary}</p>
    </div>
  );
}

function trendBadge(trend: GreenhouseConditionCompare["trend"]) {
  if (trend === "improved") return { variant: "success" as const, label: "Improving" };
  if (trend === "worsened") return { variant: "danger" as const, label: "Needs attention" };
  return { variant: "warning" as const, label: "Stable" };
}

export function GreenhouseConditionPanel({
  compare,
}: {
  compare: GreenhouseConditionCompare;
}) {
  const badge = trendBadge(compare.trend);
  const TrendIcon =
    compare.trend === "improved"
      ? ArrowUp
      : compare.trend === "worsened"
        ? ArrowDown
        : ArrowRight;

  return (
    <section className="glass-card space-y-4 rounded-2xl p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Greenhouse condition</h2>
          <p className="text-xs text-muted-foreground">
            {compare.farm} / {compare.greenhouse} — then vs now
          </p>
        </div>
        <Badge variant={badge.variant} className="gap-1">
          <TrendIcon className="size-3" />
          {badge.label}
        </Badge>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        <ConditionCard snapshot={compare.baseline} />
        <ConditionCard snapshot={compare.current} />
      </div>

      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
            Improvement over 3 months
          </p>
        </div>
        <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
          <li>
            <span className="text-muted-foreground">Health score </span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">
              {compare.healthDelta >= 0 ? "+" : ""}
              {compare.healthDelta} pts
            </span>
            {compare.percentImproved > 0 ? (
              <span className="text-muted-foreground"> ({compare.percentImproved}%)</span>
            ) : null}
          </li>
          <li>
            <span className="text-muted-foreground">Severity down </span>
            <span className="font-semibold">
              {compare.severityDelta >= 0 ? compare.severityDelta : 0} pts
            </span>
          </li>
          <li>
            <span className="text-muted-foreground">Issues resolved </span>
            <span className="font-semibold">{compare.issuesResolved}</span>
          </li>
        </ul>
      </div>
    </section>
  );
}
