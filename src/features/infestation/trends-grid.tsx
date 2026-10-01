"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import { Droplets, ExternalLink, MapPin } from "lucide-react";

import { AppSelect } from "@/components/ui/app-select";
import { Skeleton } from "@/components/ui/skeleton";
import { useScoutingData } from "@/hooks/use-scouting-data";
import {
  bemackTrendGreenhouses,
  buildDemoSprayRows,
  buildDemoTrendsRows,
  buildTrendDateLabels,
  listTrendDateKeys,
} from "@/lib/demo-trends";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import {
  buildTrendsGrid,
  collectFilterOptions,
  filterTrendsRows,
  sortGreenhousesBySeverity,
  trendsCellKey,
  type TrendsArrowState,
  type TrendsCell,
  type TrendsScoutingRow,
  type TrendsSprayRow,
} from "@/lib/trends-arrows";
import { cn } from "@/lib/utils";
import { listSpraysForHistory } from "@/services/supabase/spray-service";

const LOOKBACK_OPTIONS = [
  { value: 7, label: "Last 7 days" },
  { value: 14, label: "Last 14 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
] as const;

type Lookback = (typeof LOOKBACK_OPTIONS)[number]["value"];

function TrendArrows({
  arrows,
  size = "md",
}: {
  arrows: TrendsArrowState;
  size?: "sm" | "md";
}) {
  const isBad = arrows.tone === "bad";
  const gap = size === "sm" ? "gap-px" : "gap-0.5";
  const arrowClass = isBad
    ? size === "sm"
      ? "border-l-[3.5px] border-r-[3.5px] border-b-[6px] border-b-red-600"
      : "border-l-[4.5px] border-r-[4.5px] border-b-[8px] border-b-red-600"
    : size === "sm"
      ? "border-l-[3.5px] border-r-[3.5px] border-t-[6px] border-t-neutral-900"
      : "border-l-[4.5px] border-r-[4.5px] border-t-[8px] border-t-neutral-900";

  return (
    <span
      className={cn("inline-flex items-center", gap)}
      title={
        isBad
          ? `${arrows.count} red ↑ · ${arrows.badPct}% pressure`
          : `${arrows.count} black ↓ · ${arrows.okayPct}% okay`
      }
      aria-label={
        isBad
          ? `Bad pressure, ${arrows.count} of 4 up arrows (${arrows.badPct}%)`
          : `Okay, ${arrows.count} of 4 down arrows (${arrows.okayPct}%)`
      }
    >
      {Array.from({ length: arrows.count }, (_, i) => (
        <span
          key={i}
          className={cn(
            "inline-block border-l-transparent border-r-transparent",
            arrowClass,
          )}
        />
      ))}
    </span>
  );
}

function LatestArrows({ cell }: { cell: TrendsCell | undefined }) {
  if (!cell || cell.sampleCount === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return <TrendArrows arrows={cell.arrows} size="sm" />;
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex min-w-[9rem] flex-col gap-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <AppSelect
        aria-label={label}
        size="sm"
        align="start"
        value={value}
        onChange={onChange}
        options={options}
      />
    </label>
  );
}

export function TrendsGrid() {
  const [days, setDays] = useState<Lookback>(14);
  const [issueType, setIssueType] = useState("all");
  const [issue, setIssue] = useState("all");
  const [variety, setVariety] = useState("all");
  const [sortOrder, setSortOrder] = useState<"worst" | "name">("worst");
  const [redOnly, setRedOnly] = useState(false);
  const [sprays, setSprays] = useState<TrendsSprayRow[]>([]);

  const mode = days >= 90 ? "week" : "day";
  const { records, loading } = useScoutingData(days);

  const loadSprays = useCallback(async () => {
    if (!hasSupabaseEnv()) {
      setSprays(buildDemoSprayRows(days));
      return;
    }
    const since = subDays(new Date(), days);
    const { data } = await listSpraysForHistory({ since, limit: 1000 });
    setSprays(
      (data ?? [])
        .filter((s) => s.greenhouse_id)
        .map((s) => ({
          greenhouseId: s.greenhouse_id as string,
          sprayedAt: s.created_at,
        })),
    );
  }, [days]);

  useEffect(() => {
    void loadSprays();
  }, [loadSprays]);

  const sourceRows: TrendsScoutingRow[] = useMemo(() => {
    if (!hasSupabaseEnv()) return buildDemoTrendsRows(days);
    return records.map((r) => ({
      greenhouseId: r.greenhouseId,
      greenhouseName: r.greenhouseName,
      recordedAt: r.recordedAt,
      rating: r.rating,
      issueType: r.issueType,
      issue: r.issue,
      variety: r.variety,
    }));
  }, [days, records]);

  const filterOptions = useMemo(
    () => collectFilterOptions(sourceRows),
    [sourceRows],
  );

  // Reset dependent filters when parent changes invalidates them
  useEffect(() => {
    if (issue !== "all" && !filterOptions.issues.includes(issue)) {
      setIssue("all");
    }
  }, [filterOptions.issues, issue]);

  useEffect(() => {
    if (variety !== "all" && !filterOptions.varieties.includes(variety)) {
      setVariety("all");
    }
  }, [filterOptions.varieties, variety]);

  const filteredRows = useMemo(
    () => filterTrendsRows(sourceRows, { issueType, issue, variety }),
    [sourceRows, issueType, issue, variety],
  );

  const model = useMemo(() => {
    const dates = listTrendDateKeys(days, mode);
    const greenhouses = bemackTrendGreenhouses();
    const dateLabels = buildTrendDateLabels(dates, mode);

    const liveEmpty =
      hasSupabaseEnv() && sourceRows.length === 0;
    const rows = liveEmpty ? buildDemoTrendsRows(days) : filteredRows;
    const sprayRows =
      !hasSupabaseEnv() || liveEmpty ? buildDemoSprayRows(days) : sprays;

    const rowsForGrid = liveEmpty
      ? filterTrendsRows(rows, { issueType, issue, variety })
      : rows;

    return buildTrendsGrid(rowsForGrid, {
      dates,
      greenhouses,
      mode,
      sprays: sprayRows,
      dateLabels,
    });
  }, [days, mode, filteredRows, sprays, issueType, issue, variety, sourceRows.length]);

  const sortedGreenhouses = useMemo(() => {
    const latest = model.dates[model.dates.length - 1];
    let list = sortGreenhousesBySeverity(
      model.greenhouses,
      model.cells,
      latest,
      sortOrder,
    );
    if (redOnly && latest) {
      list = list.filter((gh) => {
        const cell = model.cells.get(trendsCellKey(gh.id, latest));
        return cell && cell.sampleCount > 0 && cell.arrows.tone === "bad";
      });
    }
    return list;
  }, [model, sortOrder, redOnly]);

  if (loading && hasSupabaseEnv()) {
    return <Skeleton className="h-96 w-full rounded-2xl" />;
  }

  const latestDate = model.dates[model.dates.length - 1];
  const { summary } = model;
  const showingDemoFallback = !hasSupabaseEnv() || sourceRows.length === 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Coverage"
          value={`${summary.coveragePct}%`}
          hint={`${summary.housesScouted}/${summary.housesTotal} houses scouted`}
        />
        <SummaryCard
          label="High pressure"
          value={String(summary.housesHighPressure)}
          hint="Red on latest column"
          tone={summary.housesHighPressure > 0 ? "danger" : "ok"}
        />
        <SummaryCard
          label="Improved"
          value={String(summary.housesImproved)}
          hint="Vs previous column"
          tone="ok"
        />
        <SummaryCard
          label="Worsened"
          value={String(summary.housesWorsened)}
          hint="Vs previous column"
          tone={summary.housesWorsened > 0 ? "warn" : "ok"}
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <FilterSelect
          label="Range"
          value={String(days)}
          onChange={(v) => setDays(Number(v) as Lookback)}
          options={LOOKBACK_OPTIONS.map((o) => ({
            value: String(o.value),
            label: o.label,
          }))}
        />
        <FilterSelect
          label="Type"
          value={issueType}
          onChange={(v) => {
            setIssueType(v);
            setIssue("all");
          }}
          options={[
            { value: "all", label: "All types" },
            { value: "pest", label: "Pests" },
            { value: "disease", label: "Diseases" },
            ...filterOptions.issueTypes
              .filter((t) => t !== "pest" && t !== "disease")
              .map((t) => ({ value: t, label: t })),
          ]}
        />
        <FilterSelect
          label="Pest / disease"
          value={issue}
          onChange={setIssue}
          options={[
            { value: "all", label: "All issues" },
            ...filterOptions.issues
              .filter((name) => {
                if (issueType === "all") return true;
                return sourceRows.some(
                  (r) => r.issue === name && r.issueType === issueType,
                );
              })
              .map((name) => ({ value: name, label: name })),
          ]}
        />
        <FilterSelect
          label="Variety"
          value={variety}
          onChange={setVariety}
          options={[
            { value: "all", label: "All varieties" },
            ...filterOptions.varieties.map((name) => ({
              value: name,
              label: name,
            })),
          ]}
        />
        <FilterSelect
          label="Sort"
          value={sortOrder}
          onChange={(v) => setSortOrder(v as "worst" | "name")}
          options={[
            { value: "worst", label: "Worst first" },
            { value: "name", label: "Name A–Z" },
          ]}
        />
        <label className="flex items-center gap-2 pb-1.5 text-sm">
          <input
            type="checkbox"
            className="size-4 rounded border-border"
            checked={redOnly}
            onChange={(e) => setRedOnly(e.target.checked)}
          />
          Red only
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <TrendArrows
            arrows={{ tone: "okay", count: 3, badPct: 25, okayPct: 75 }}
            size="sm"
          />
          Black ↓ = okay
        </span>
        <span className="inline-flex items-center gap-1.5">
          <TrendArrows
            arrows={{ tone: "bad", count: 3, badPct: 75, okayPct: 25 }}
            size="sm"
          />
          Red ↑ = pressure
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Droplets className="size-3.5 text-sky-600" />
          Spray logged
        </span>
        <span>1–4 arrows = 25% steps</span>
        {mode === "week" ? <span>90-day view uses weekly columns</span> : null}
      </div>

      <div className="glass-card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/70 bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="sticky left-0 z-10 bg-muted/95 px-3 py-2.5 font-medium backdrop-blur-sm">
                  Greenhouse
                </th>
                {model.dates.map((dateKey) => (
                  <th
                    key={dateKey}
                    className="whitespace-nowrap px-2 py-2.5 text-center font-medium"
                  >
                    {model.dateLabels[dateKey] ?? dateKey}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedGreenhouses.length === 0 ? (
                <tr>
                  <td
                    colSpan={model.dates.length + 1}
                    className="px-3 py-8 text-center text-sm text-muted-foreground"
                  >
                    No greenhouses match the current filters.
                  </td>
                </tr>
              ) : (
                sortedGreenhouses.map((gh) => {
                  const latestCell = latestDate
                    ? model.cells.get(trendsCellKey(gh.id, latestDate))
                    : undefined;
                  const lastScouted = summary.lastScoutedByHouse.get(gh.id);

                  return (
                    <tr
                      key={gh.id}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/20"
                    >
                      <td className="sticky left-0 z-10 bg-background/95 px-3 py-2.5 backdrop-blur-sm">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-2.5 font-medium">
                            <span className="min-w-[4.5rem] tabular-nums">
                              {gh.name}
                            </span>
                            <LatestArrows cell={latestCell} />
                          </span>
                          <span className="inline-flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            {lastScouted ? (
                              <span>
                                Scouted {format(parseISO(lastScouted), "dd MMM")}
                              </span>
                            ) : (
                              <span>Not scouted in range</span>
                            )}
                            <Link
                              href={`/admin/history?greenhouse=${encodeURIComponent(gh.id)}`}
                              className="inline-flex items-center gap-0.5 text-primary hover:underline"
                            >
                              History
                              <ExternalLink className="size-2.5" />
                            </Link>
                            <Link
                              href="/admin/map"
                              className="inline-flex items-center gap-0.5 text-primary hover:underline"
                            >
                              <MapPin className="size-2.5" />
                              Map
                            </Link>
                          </span>
                        </div>
                      </td>
                      {model.dates.map((dateKey) => {
                        const cell = model.cells.get(
                          trendsCellKey(gh.id, dateKey),
                        );
                        return (
                          <td
                            key={dateKey}
                            className="px-2 py-2.5 text-center align-middle"
                          >
                            <div className="inline-flex flex-col items-center gap-0.5">
                              {cell && cell.sampleCount > 0 ? (
                                <TrendArrows arrows={cell.arrows} />
                              ) : (
                                <span className="text-muted-foreground/40">·</span>
                              )}
                              {cell && cell.sprayCount > 0 ? (
                                <span
                                  className="inline-flex items-center gap-0.5 text-[10px] text-sky-700"
                                  title={`${cell.sprayCount} spray(s) logged`}
                                >
                                  <Droplets className="size-2.5" />
                                  {cell.sprayCount > 1 ? cell.sprayCount : null}
                                </span>
                              ) : null}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Daily cells use average scouting rating for that greenhouse
        {issue !== "all" || variety !== "all" || issueType !== "all"
          ? " (filtered)"
          : ""}
        . Empty cells (·) mean not scouted — not necessarily clean.
        {!hasSupabaseEnv() || showingDemoFallback
          ? " Showing demo Scarab-style trends."
          : null}
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "neutral" | "ok" | "warn" | "danger";
}) {
  return (
    <div className="glass-card rounded-2xl p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums",
          tone === "danger" && "text-red-600",
          tone === "warn" && "text-amber-600",
          tone === "ok" && "text-emerald-700",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}
