"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AlertTriangle, Calendar, Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ExportExcelButton } from "@/components/export-excel-button";
import { buildSprayWorkProgram, type SprayPriority } from "@/lib/spray-work-program";
import { useHotspotResolutionRefs } from "@/hooks/use-hotspot-resolution";
import { useScoutingData, toSprayInput } from "@/hooks/use-scouting-data";
import { filterUnresolvedScoutingRecords } from "@/lib/issue-resolution";
import { excelFilename, sprayProgramToExcel } from "@/lib/admin-export-mappers";
import { cn } from "@/lib/utils";

function priorityBadge(p: SprayPriority) {
  if (p === "urgent") return { variant: "danger" as const, label: "Spray today", Icon: AlertTriangle };
  if (p === "scheduled") return { variant: "warning" as const, label: "Within 48h", Icon: Calendar };
  return { variant: "outline" as const, label: "Watch", Icon: Eye };
}

export function SprayWorkProgramPanel({
  compact,
  basePath = "/manager",
}: {
  compact?: boolean;
  basePath?: "/manager" | "/admin";
}) {
  const { records, loading } = useScoutingData(7);
  const resolutionHotspots = useHotspotResolutionRefs();
  const program = useMemo(() => {
    const openRecords = filterUnresolvedScoutingRecords(records, resolutionHotspots);
    return buildSprayWorkProgram(openRecords.map(toSprayInput));
  }, [records, resolutionHotspots]);
  const urgent = program.filter((p) => p.priority === "urgent");
  const scheduled = program.filter((p) => p.priority === "scheduled");
  const exportRows = sprayProgramToExcel(program);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <section className={cn("space-y-4", !compact && "glass-card rounded-2xl p-4")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Sprays today</h2>
          {!compact ? (
            <p className="text-sm text-muted-foreground">From scouting.</p>
          ) : null}
        </div>
        {!compact ? (
          <div className="flex flex-wrap gap-2">
            <ExportExcelButton
              rows={exportRows}
              filename={excelFilename("spray-work-program")}
              sheetName="Spray program"
            />
            {basePath === "/manager" ? (
              <Link href={`${basePath}/spray`} className={buttonVariants({ size: "sm" })}>
                Log spray
              </Link>
            ) : null}
            <Link href={`${basePath}/map`} className={buttonVariants({ size: "sm", variant: "outline" })}>
              Map
            </Link>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3">
          <p className="text-2xl font-semibold tabular-nums text-red-600">{urgent.length}</p>
          <p className="text-xs text-muted-foreground">Urgent</p>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="text-2xl font-semibold tabular-nums text-amber-600">{scheduled.length}</p>
          <p className="text-xs text-muted-foreground">Soon</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-2xl font-semibold tabular-nums">{program.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
      </div>

      {program.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No sprays needed today. Resolved hotspots are cleared from this list.
        </p>
      ) : (
        <ul className="space-y-2">
          {program.slice(0, compact ? 4 : 12).map((item) => {
            const badge = priorityBadge(item.priority);
            const Icon = badge.Icon;
            return (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 bg-background/60 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {item.greenhouse} · {item.issue} · {badge.label}
                  </p>
                </div>
                <Badge variant={badge.variant} className="shrink-0">
                  {item.rating}/5
                </Badge>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
