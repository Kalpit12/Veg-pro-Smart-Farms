"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  MapPin,
} from "lucide-react";

import { AppSelect } from "@/components/ui/app-select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDemoRefresh } from "@/hooks/use-demo-refresh";
import { useToast } from "@/hooks/use-toast";
import { buildDemoWorkerTrends } from "@/lib/demo-worker-trends";
import { formatDistance, formatDuration } from "@/lib/route-metrics";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";
import {
  buildWorkerSummaries,
  kindLabel,
  missedGreenhousesThisCycle,
  type DaySparkPoint,
  type WorkerHistoryEvent,
  type WorkerTrendsSort,
  type WorkerTrendsSummary,
  type WorkerWorkKind,
} from "@/lib/worker-trends";
import { listWorkerTrendsSince } from "@/services/supabase/worker-trends-service";

const LOOKBACK_OPTIONS = [
  { value: 7, label: "Last 7 days" },
  { value: 14, label: "Last 14 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
] as const;

type Lookback = (typeof LOOKBACK_OPTIONS)[number]["value"];

function kindBadgeVariant(kind: WorkerWorkKind) {
  if (kind === "infestation_report") return "warning" as const;
  if (kind === "spray") return "success" as const;
  if (kind === "scouting_round") return "outline" as const;
  if (kind === "scouting_stop") return "outline" as const;
  return "outline" as const;
}

function formatWhen(iso: string) {
  return format(parseISO(iso), "dd MMM yyyy · HH:mm");
}

function Sparkline({ points }: { points: DaySparkPoint[] }) {
  const max = Math.max(1, ...points.map((p) => p.count));
  return (
    <div className="flex h-8 items-end gap-0.5" title="Daily activity">
      {points.map((p) => (
        <span
          key={p.dateKey}
          className="w-1.5 rounded-sm bg-primary/70"
          style={{ height: `${Math.max(8, (p.count / max) * 100)}%` }}
          title={`${p.label}: ${p.count}`}
        />
      ))}
    </div>
  );
}

export function WorkerTrendsPanel() {
  const { toast } = useToast();
  const { tick } = useDemoRefresh();
  const [days, setDays] = useState<Lookback>(14);
  const [workerFilter, setWorkerFilter] = useState("all");
  const [scoutsOnly, setScoutsOnly] = useState(false);
  const [sort, setSort] = useState<WorkerTrendsSort>("activity");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [workers, setWorkers] = useState<{ id: string; name: string }[]>([]);
  const [events, setEvents] = useState<WorkerHistoryEvent[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (!hasSupabaseEnv()) {
        const demo = buildDemoWorkerTrends(days);
        setWorkers(demo.workers);
        setEvents(demo.events);
        return;
      }

      const since = subDays(new Date(), days);
      const data = await listWorkerTrendsSince(since);
      if (data.workers.length === 0 && data.events.length === 0) {
        const demo = buildDemoWorkerTrends(days);
        setWorkers(demo.workers);
        setEvents(demo.events);
        return;
      }
      setWorkers(data.workers);
      setEvents(data.events);
    } catch (e) {
      toast({
        title: "Worker trends unavailable",
        description: e instanceof Error ? e.message : "Unknown error",
        tone: "error",
      });
      const demo = buildDemoWorkerTrends(days);
      setWorkers(demo.workers);
      setEvents(demo.events);
    } finally {
      setLoading(false);
    }
  }, [days, toast]);

  useEffect(() => {
    void refresh();
  }, [refresh, tick]);

  const summaries = useMemo(
    () =>
      buildWorkerSummaries(workers, events, {
        lookbackDays: days,
        sort,
        scoutsOnly,
      }),
    [workers, events, days, sort, scoutsOnly],
  );

  const visibleSummaries = useMemo(() => {
    if (workerFilter === "all") return summaries;
    return summaries.filter((s) => s.workerId === workerFilter);
  }, [summaries, workerFilter]);

  const missedHouses = useMemo(
    () => missedGreenhousesThisCycle(events, 7),
    [events],
  );

  const totals = useMemo(() => {
    return visibleSummaries.reduce(
      (acc, s) => {
        acc.events += s.totalEvents;
        acc.reports += s.reports;
        acc.sprays += s.sprays;
        acc.scouting += s.scoutingStops;
        acc.rounds += s.roundsCompleted;
        acc.durationS += s.totalDurationS;
        acc.distanceM += s.totalDistanceM;
        const set = new Set(acc.greenhouses);
        s.greenhouseNames.forEach((g) => set.add(g));
        acc.greenhouses = Array.from(set);
        return acc;
      },
      {
        events: 0,
        reports: 0,
        sprays: 0,
        scouting: 0,
        rounds: 0,
        durationS: 0,
        distanceM: 0,
        greenhouses: [] as string[],
      },
    );
  }, [visibleSummaries]);

  if (loading) {
    return <Skeleton className="h-72 w-full rounded-2xl" />;
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Worker trends</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Scarab-style scout performance: time, coverage, houses, route quality,
            and full history.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[8rem] flex-col gap-1 text-xs">
            <span className="text-muted-foreground">Range</span>
            <AppSelect
              aria-label="Date range"
              size="sm"
              align="end"
              value={String(days)}
              onChange={(next) => setDays(Number(next) as Lookback)}
              options={LOOKBACK_OPTIONS.map((o) => ({
                value: String(o.value),
                label: o.label,
              }))}
            />
          </label>
          <label className="flex min-w-[10rem] flex-col gap-1 text-xs">
            <span className="text-muted-foreground">Worker</span>
            <AppSelect
              aria-label="Worker"
              size="sm"
              align="end"
              value={workerFilter}
              onChange={(next) => {
                setWorkerFilter(next);
                setExpandedId(next === "all" ? null : next);
              }}
              options={[
                { value: "all", label: "All workers" },
                ...workers.map((w) => ({ value: w.id, label: w.name })),
              ]}
            />
          </label>
          <label className="flex min-w-[9rem] flex-col gap-1 text-xs">
            <span className="text-muted-foreground">Sort</span>
            <AppSelect
              aria-label="Sort workers"
              size="sm"
              align="end"
              value={sort}
              onChange={(next) => setSort(next as WorkerTrendsSort)}
              options={[
                { value: "activity", label: "Most activity" },
                { value: "coverage", label: "Best coverage" },
                { value: "time", label: "Most time in field" },
                { value: "houses", label: "Most houses" },
                { value: "name", label: "Name A–Z" },
              ]}
            />
          </label>
          <label className="flex items-center gap-2 pb-1.5 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border-border"
              checked={scoutsOnly}
              onChange={(e) => setScoutsOnly(e.target.checked)}
            />
            Scouts only
          </label>
        </div>
      </header>

      {missedHouses.length > 0 ? (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" />
          <div>
            <p className="font-medium text-amber-950 dark:text-amber-100">
              {missedHouses.length} greenhouse
              {missedHouses.length === 1 ? "" : "s"} not scouted in the last 7 days
            </p>
            <p className="mt-0.5 text-xs text-amber-900/80 dark:text-amber-100/70">
              {missedHouses.slice(0, 8).join(", ")}
              {missedHouses.length > 8 ? ` +${missedHouses.length - 8} more` : ""}
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total actions" value={String(totals.events)} />
        <StatCard
          label="Rounds"
          value={String(totals.rounds)}
          hint={formatDuration(totals.durationS)}
        />
        <StatCard
          label="Distance walked"
          value={formatDistance(totals.distanceM)}
        />
        <StatCard
          label="Reports / sprays"
          value={`${totals.reports} / ${totals.sprays}`}
        />
        <StatCard
          label="Greenhouses worked"
          value={String(totals.greenhouses.length)}
          hint={
            totals.greenhouses.length
              ? totals.greenhouses.slice(0, 3).join(", ") +
                (totals.greenhouses.length > 3
                  ? ` +${totals.greenhouses.length - 3}`
                  : "")
              : "None in range"
          }
        />
      </div>

      <div className="space-y-3">
        {visibleSummaries.map((summary) => {
          const open = expandedId === summary.workerId;
          const workerEvents = events.filter(
            (e) => e.workerId === summary.workerId,
          );
          return (
            <WorkerTrendCard
              key={summary.workerId}
              summary={summary}
              events={workerEvents}
              open={open}
              onToggle={() =>
                setExpandedId(open ? null : summary.workerId)
              }
            />
          );
        })}
        {!visibleSummaries.length ? (
          <p className="text-sm text-muted-foreground">
            No worker activity in this range
            {scoutsOnly ? " (scouts only)" : ""}.
          </p>
        ) : null}
      </div>

      {!hasSupabaseEnv() ? (
        <p className="text-xs text-muted-foreground">
          Showing demo worker trends.
        </p>
      ) : null}
    </section>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="glass-card rounded-2xl p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? (
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function WorkerTrendCard({
  summary,
  events,
  open,
  onToggle,
}: {
  summary: WorkerTrendsSummary;
  events: WorkerHistoryEvent[];
  open: boolean;
  onToggle: () => void;
}) {
  const historyEvents = events.filter((e) => e.kind !== "scouting_round");
  const latestRound = summary.rounds[0];

  return (
    <div className="glass-card overflow-hidden rounded-2xl">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-muted/30"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {open ? (
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            )}
            <span className="font-semibold">{summary.workerName}</span>
            {summary.isScout ? (
              <Badge variant="outline">Scout</Badge>
            ) : null}
            <Badge variant="outline">{summary.totalEvents} actions</Badge>
            <Badge variant="outline">
              {summary.greenhouseCount} greenhouse
              {summary.greenhouseCount === 1 ? "" : "s"}
            </Badge>
            {summary.avgCoveragePct != null ? (
              <Badge
                variant={summary.avgCoveragePct >= 40 ? "success" : "warning"}
              >
                {summary.avgCoveragePct}% coverage
              </Badge>
            ) : null}
            {summary.auditFlags.map((f) => (
              <Badge key={f} variant="danger">
                {f === "short"
                  ? "Short round"
                  : f === "low_coverage"
                    ? "Low coverage"
                    : "No GPS"}
              </Badge>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-4 pl-6">
            <Sparkline points={summary.sparkline} />
            <p className="text-xs text-muted-foreground">
              {summary.roundsCompleted} rounds ·{" "}
              {formatDuration(summary.totalDurationS)} ·{" "}
              {formatDistance(summary.totalDistanceM)}
              {summary.stopsPerHour != null
                ? ` · ${summary.stopsPerHour} stops/h`
                : ""}
              {summary.highSeverityFinds > 0
                ? ` · ${summary.highSeverityFinds} high severity`
                : ""}
            </p>
          </div>

          <p className="mt-1 pl-6 text-xs text-muted-foreground">
            {summary.reports} reports · {summary.sprays} sprays ·{" "}
            {summary.scoutingStops} scouting stops · {summary.activities} other
            {summary.lastActiveAt
              ? ` · last ${formatWhen(summary.lastActiveAt)}`
              : ""}
          </p>

          {summary.housesThisWeek.length ? (
            <p className="mt-1 pl-6 text-xs text-muted-foreground">
              This week:{" "}
              <span className="text-foreground">
                {summary.housesThisWeek.join(", ")}
              </span>
            </p>
          ) : summary.greenhouseNames.length ? (
            <p className="mt-1 pl-6 text-xs text-muted-foreground">
              Houses:{" "}
              <span className="text-foreground">
                {summary.greenhouseNames.join(", ")}
              </span>
            </p>
          ) : (
            <p className="mt-1 pl-6 text-xs text-muted-foreground">
              No greenhouses recorded in this range.
            </p>
          )}
        </div>
      </button>

      {open ? (
        <div className="space-y-4 border-t border-border/70 p-4">
          {summary.rounds.length > 0 ? (
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Scouting rounds</h3>
                {latestRound ? (
                  <Link
                    href={`/admin/scouting?round=${encodeURIComponent(latestRound.id)}`}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MapPin className="size-3" />
                    Open latest route
                    <ExternalLink className="size-2.5" />
                  </Link>
                ) : null}
              </div>
              <div className="overflow-x-auto rounded-xl border border-border/60">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30 text-xs text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Started</th>
                      <th className="px-3 py-2 font-medium">Greenhouse</th>
                      <th className="px-3 py-2 font-medium">Stops</th>
                      <th className="px-3 py-2 font-medium">Time</th>
                      <th className="px-3 py-2 font-medium">Distance</th>
                      <th className="px-3 py-2 font-medium">Coverage</th>
                      <th className="px-3 py-2 font-medium">Route</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.rounds.map((round) => (
                      <tr key={round.id} className="border-b border-border/40">
                        <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                          {formatWhen(round.startedAt)}
                        </td>
                        <td className="px-3 py-2">
                          {round.greenhouseName ?? "—"}
                          {round.flags.length ? (
                            <span className="mt-0.5 block text-[11px] text-red-600">
                              {round.flags.join(" · ")}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 tabular-nums">{round.stopCount}</td>
                        <td className="px-3 py-2 tabular-nums">
                          {formatDuration(round.durationS)}
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {formatDistance(round.distanceM)}
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {round.coveragePct != null
                            ? `${round.coveragePct}%`
                            : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <Link
                            href={`/admin/scouting?round=${encodeURIComponent(round.id)}`}
                            className="text-xs text-primary hover:underline"
                          >
                            Map
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div>
            <h3 className="mb-2 text-sm font-semibold">Activity history</h3>
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30 text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Date / time</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Work</th>
                    <th className="px-3 py-2 font-medium">Greenhouse</th>
                    <th className="px-3 py-2 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {historyEvents.map((event) => (
                    <tr key={event.id} className="border-b border-border/40">
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-muted-foreground">
                        {formatWhen(event.occurredAt)}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant={kindBadgeVariant(event.kind)}>
                          {kindLabel(event.kind)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 font-medium">{event.title}</td>
                      <td className="px-3 py-2.5">
                        {event.greenhouseName ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {event.detail ?? "—"}
                        {event.severity != null ? (
                          <span
                            className={cn(
                              "ml-1",
                              event.severity >= 4 && "text-red-600",
                            )}
                          >
                            · {event.severity}/5
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {!historyEvents.length ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-6 text-center text-sm text-muted-foreground"
                      >
                        No activity history in this range.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
