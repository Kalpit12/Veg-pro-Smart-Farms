"use client";

import { useEffect, useMemo, useState } from "react";

import { AppSelect } from "@/components/ui/app-select";
import { Badge } from "@/components/ui/badge";
import {
  BEMACK_GREENHOUSES,
  bayMaxForGreenhouse,
  columnCountForBay,
  formatStarGreenhouseLabel,
  greenhouseCellExists,
  issueShortCode,
  maxColumnsForGreenhouse,
} from "@/lib/bemack-master-data";
import { buildGreenhouseGrid, scoreColor, type ScoutingGridInput } from "@/lib/greenhouse-grid";
import { filterUnresolvedScoutingRecords } from "@/lib/issue-resolution";
import { useHotspotResolutionRefs } from "@/hooks/use-hotspot-resolution";
import { useScoutingData } from "@/hooks/use-scouting-data";
import { cn } from "@/lib/utils";
import type { ScoutCellLocation } from "@/lib/scout-observation-flow";

type GreenhouseHeatGridProps = {
  greenhouseName?: string;
  lockGreenhouse?: boolean;
  /** When set, only observations from this scouting round appear on the grid. */
  roundId?: string | null;
  interactive?: boolean;
  selectedCell?: ScoutCellLocation | null;
  onCellSelect?: (cell: ScoutCellLocation) => void;
  /** Hide section title chrome when embedded in a report. */
  compact?: boolean;
};

export function GreenhouseHeatGrid({
  greenhouseName,
  lockGreenhouse = false,
  roundId = null,
  interactive = false,
  selectedCell = null,
  onCellSelect,
  compact = false,
}: GreenhouseHeatGridProps) {
  const { records, loading } = useScoutingData(14);
  const resolutionHotspots = useHotspotResolutionRefs();
  const [greenhouse, setGreenhouse] = useState(greenhouseName ?? "STGH01A");

  useEffect(() => {
    if (greenhouseName) setGreenhouse(greenhouseName);
  }, [greenhouseName]);

  const grid = useMemo(() => {
    const scoped = roundId
      ? records.filter((r) => r.roundId === roundId)
      : records;
    const activeRecords = filterUnresolvedScoutingRecords(scoped, resolutionHotspots);
    const input: ScoutingGridInput[] = activeRecords.map((r) => ({
      greenhouseName: r.greenhouseName,
      columnNo: r.columnNo,
      bayNo: r.bayNo,
      issueType: r.issueType,
      issue: r.issue,
      rating: r.rating,
    }));
    return buildGreenhouseGrid(input, greenhouse);
  }, [records, greenhouse, resolutionHotspots, roundId]);

  const { columns, bayRows, cellLookup } = useMemo(() => {
    const bayMax = bayMaxForGreenhouse(greenhouse);
    const maxColumn = maxColumnsForGreenhouse(greenhouse);
    const cols = Array.from({ length: maxColumn }, (_, i) => i + 1);
    const bays = Array.from({ length: bayMax }, (_, i) => i + 1);
    const lookup = new Map<string, NonNullable<typeof grid>["cells"][0]>();
    grid?.cells.forEach((c) => lookup.set(`${c.column}-${c.bay}`, c));
    return { columns: cols, bayRows: bays, cellLookup: lookup };
  }, [grid, greenhouse]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading greenhouse grid…</p>;
  }

  return (
    <section
      className={compact ? "space-y-4" : "glass-card space-y-4 rounded-2xl p-4"}
      data-testid="greenhouse-heat-map"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {!compact ? (
            <>
              <h2 className="text-lg font-semibold">Greenhouse heat map</h2>
              <p className="text-sm text-muted-foreground">
                {interactive
                  ? `Tap a box to choose column × bay. Layout is ${bayMaxForGreenhouse(greenhouse)} bays × up to ${maxColumnsForGreenhouse(greenhouse)} columns.`
                  : `Bays and columns match Star mapping (${bayMaxForGreenhouse(greenhouse)} bays, up to ${maxColumnsForGreenhouse(greenhouse)} columns for ${greenhouse}). Red = higher issue rating. Resolved hotspots are hidden.`}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Observations from this round on the bay × column grid.
            </p>
          )}
        </div>
        {lockGreenhouse ? (
          <p className="text-sm font-medium">{formatStarGreenhouseLabel(greenhouse)}</p>
        ) : (
          <label className="flex w-full min-w-[14rem] max-w-md flex-col gap-1 text-sm font-medium">
            Greenhouse
            <AppSelect
              aria-label="Greenhouse"
              value={greenhouse}
              onChange={setGreenhouse}
              options={BEMACK_GREENHOUSES.map((gh) => ({
                value: gh,
                label: formatStarGreenhouseLabel(gh),
              }))}
            />
          </label>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="size-3 rounded bg-emerald-400/80" /> Low
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-3 rounded bg-amber-400" /> Medium
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-3 rounded bg-red-600" /> High
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              <th className="p-1 text-muted-foreground">Bay ↓ Col →</th>
              {columns.map((col) => (
                <th key={col} className="p-1 font-medium text-muted-foreground">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bayRows.map((bay) => (
              <tr key={bay}>
                <td className="p-1 pr-2 text-muted-foreground">{bay}</td>
                {columns.map((col) => {
                  const inLayout = greenhouseCellExists(greenhouse, col, bay);
                  const cell = inLayout ? cellLookup.get(`${col}-${bay}`) : undefined;
                  const isSelected =
                    inLayout &&
                    selectedCell?.column === col &&
                    selectedCell?.bay === bay;
                  const colorClass = !inLayout
                    ? "bg-transparent border-transparent"
                    : cell
                      ? scoreColor(cell.score)
                      : "bg-muted/25";
                  const shortCode = cell?.topIssue ? issueShortCode(cell.topIssue) : "";
                  const title = !inLayout
                    ? `No column ${col} in bay ${bay}`
                    : cell
                      ? `${cell.topIssue}${shortCode ? ` (${shortCode})` : ""} · ${Math.round(cell.score / 20)}/5`
                      : `Col ${col} · Bay ${bay} (${columnCountForBay(greenhouse, bay)} cols)`;
                  const codeTextClass =
                    cell && cell.score >= 80
                      ? "text-white"
                      : cell && cell.score >= 50
                        ? "text-amber-950"
                        : "text-emerald-950";
                  const boxClass = cn(
                    "flex items-center justify-center rounded-sm border border-background/50 p-0.5 text-center font-bold leading-none",
                    shortCode ? "size-8 min-w-8 text-[8px] sm:text-[9px]" : "size-6",
                    colorClass,
                    shortCode && codeTextClass,
                    isSelected && "ring-2 ring-primary ring-offset-1",
                    interactive && inLayout && "cursor-pointer hover:ring-2 hover:ring-primary/70",
                  );
                  const cellLabel = shortCode || undefined;
                  return (
                    <td key={`${col}-${bay}`} className="p-0.5">
                      {interactive && inLayout ? (
                        <button
                          type="button"
                          title={title}
                          aria-label={`Column ${col}, bay ${bay}${shortCode ? `, ${cell?.topIssue} ${shortCode}` : ""}`}
                          aria-pressed={isSelected}
                          data-testid={`heat-cell-${col}-${bay}`}
                          onClick={() => onCellSelect?.({ column: col, bay })}
                          className={boxClass}
                        >
                          {cellLabel}
                        </button>
                      ) : (
                        <div title={title} className={boxClass} aria-hidden={!cellLabel}>
                          {cellLabel}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {grid?.cells.length ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {[...grid.cells]
            .sort((a, b) => b.score - a.score)
            .slice(0, 6)
            .map((c) => (
              <li
                key={`${c.column}-${c.bay}`}
                className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm"
              >
                <span>
                  Col {c.column} · Bay {c.bay} —{" "}
                  {c.topIssue}
                  {issueShortCode(c.topIssue) ? (
                    <span className="ml-1 font-semibold text-muted-foreground">
                      ({issueShortCode(c.topIssue)})
                    </span>
                  ) : null}
                </span>
                <Badge variant={c.score >= 80 ? "danger" : c.score >= 50 ? "warning" : "outline"}>
                  {Math.round(c.score / 20)}/5
                </Badge>
              </li>
            ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No open issues for {greenhouse}. The bay layout still follows the Star mapping.
        </p>
      )}
    </section>
  );
}
