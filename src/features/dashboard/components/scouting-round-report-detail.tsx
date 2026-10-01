"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, MapPin, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GreenhouseHeatGrid } from "@/features/scouting/greenhouse-heat-grid";
import { formatStarGreenhouseLabel, issueShortCode } from "@/lib/bemack-master-data";
import { formatDistance, formatDuration, durationSeconds } from "@/lib/route-metrics";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { YesterdayScoutRound } from "@/lib/scouting-yesterday";
import { listRecordsForRound } from "@/services/supabase/scouting-round-service";
import { useScoutingStore, type DemoScoutingRecord } from "@/store/scouting-store";
import { cn } from "@/lib/utils";

type ReportRecord = {
  id: string;
  issue: string;
  issueType: string;
  rating: number | null;
  columnNo: number;
  bayNo: number;
  recordedAt: string;
  scoutName: string;
};

function fromDemo(r: DemoScoutingRecord): ReportRecord {
  return {
    id: r.id,
    issue: r.issue,
    issueType: r.issueType,
    rating: r.rating,
    columnNo: r.columnNo,
    bayNo: r.bayNo,
    recordedAt: r.recordedAt,
    scoutName: r.scoutName,
  };
}

type Props = {
  round: YesterdayScoutRound;
  onBack: () => void;
  scoutingBasePath?: string;
};

export function ScoutingRoundReportDetail({
  round,
  onBack,
  scoutingBasePath = "/admin/scouting",
}: Props) {
  const demoRecords = useScoutingStore((s) => s.demoRecords);
  const [loading, setLoading] = useState(hasSupabaseEnv());
  const [records, setRecords] = useState<ReportRecord[]>([]);

  const load = useCallback(async () => {
    if (!hasSupabaseEnv()) {
      setRecords(
        demoRecords
          .filter((r) => r.roundId === round.roundId)
          .map(fromDemo)
          .sort(
            (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
          ),
      );
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await listRecordsForRound(round.roundId);
    setRecords(
      (data ?? []).map((r) => ({
        id: r.id,
        issue: r.issue_name,
        issueType: r.issue_type,
        rating: r.rating,
        columnNo: r.column_no,
        bayNo: r.bay_no,
        recordedAt: r.recorded_at,
        scoutName: "Scout",
      })),
    );
    setLoading(false);
  }, [demoRecords, round.roundId]);

  useEffect(() => {
    void load();
  }, [load]);

  const durationS = useMemo(() => {
    if (round.durationS != null) return round.durationS;
    if (round.endedAt) return durationSeconds(round.startedAt, round.endedAt);
    return null;
  }, [round.durationS, round.startedAt, round.endedAt]);

  const highSeverity = records.filter((r) => (r.rating ?? 0) >= 4).length;

  return (
    <section className="glass-card space-y-5 rounded-2xl p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button type="button" variant="ghost" size="sm" className="-ml-2" onClick={onBack}>
            <ArrowLeft className="mr-1 size-4" />
            Back to yesterday&apos;s houses
          </Button>
          <h2 className="text-xl font-semibold">{round.greenhouseName}</h2>
          <p className="text-sm text-muted-foreground">
            {formatStarGreenhouseLabel(round.greenhouseName)}
          </p>
        </div>
        <Link
          href={`${scoutingBasePath}?round=${encodeURIComponent(round.roundId)}`}
          className="inline-flex"
        >
          <Button type="button" variant="outline" size="sm">
            <ExternalLink className="mr-1 size-3.5" />
            Full scouting page
          </Button>
        </Link>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
        <div>
          <dt className="text-xs text-muted-foreground">Scout</dt>
          <dd className="font-medium">{round.scoutName}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Started</dt>
          <dd className="font-medium">{format(new Date(round.startedAt), "MMM d HH:mm")}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Duration</dt>
          <dd className="font-medium">{formatDuration(durationS)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Distance</dt>
          <dd className="font-medium">{formatDistance(round.distanceM)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Observations</dt>
          <dd className="font-medium">{records.length || round.stopCount}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Coverage</dt>
          <dd className="font-medium">
            {round.coveragePct != null ? `${round.coveragePct}%` : "—"}
          </dd>
        </div>
      </dl>

      {highSeverity > 0 ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
          {highSeverity} high-severity observation{highSeverity === 1 ? "" : "s"} (rating 4–5) in
          this round.
        </p>
      ) : null}

      <GreenhouseHeatGrid
        greenhouseName={round.greenhouseName}
        lockGreenhouse
        roundId={round.roundId}
        compact
      />

      <div>
        <h3 className="mb-2 text-base font-semibold">All observations</h3>
        {loading ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : records.length ? (
          <ol className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-border bg-muted/20 p-2 text-sm">
            {records.map((r, i) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-background/80 px-3 py-2"
              >
                <span>
                  {i + 1}. Col {r.columnNo} · Bay {r.bayNo} — {r.issue}
                  {issueShortCode(r.issue) ? (
                    <span className="ml-1 font-semibold text-muted-foreground">
                      ({issueShortCode(r.issue)})
                    </span>
                  ) : null}
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  {r.rating != null ? (
                    <Badge
                      variant={r.rating >= 4 ? "danger" : r.rating >= 3 ? "warning" : "outline"}
                    >
                      {r.rating}/5
                    </Badge>
                  ) : null}
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(r.recordedAt), "HH:mm")}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">No observation rows for this round.</p>
        )}
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <MapPin className="size-3.5" />
        GPS route map and coverage analytics are on the{" "}
        <Link
          href={`${scoutingBasePath}?round=${encodeURIComponent(round.roundId)}`}
          className={cn("font-medium text-primary underline-offset-2 hover:underline")}
        >
          scouting page
        </Link>
        .
      </p>
    </section>
  );
}
