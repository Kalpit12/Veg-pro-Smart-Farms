"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { ChevronRight, Leaf } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoutingRoundReportDetail } from "@/features/dashboard/components/scouting-round-report-detail";
import { useRealtimeScouting } from "@/hooks/use-realtime-scouting";
import { formatStarGreenhouseLabel } from "@/lib/bemack-master-data";
import {
  dedupeByGreenhouse,
  filterRoundsStartedYesterday,
  yesterdayLabel,
  yesterdayWindow,
  type YesterdayScoutRound,
} from "@/lib/scouting-yesterday";
import { formatDistance, formatDuration } from "@/lib/route-metrics";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import {
  listScoutingRounds,
  listScoutingRoundsBetween,
} from "@/services/supabase/scouting-round-service";
import { useScoutingStore } from "@/store/scouting-store";
import { cn } from "@/lib/utils";

export function YesterdayScoutedGreenhouses() {
  const demoRounds = useScoutingStore((s) => s.demoRounds);
  const [loading, setLoading] = useState(true);
  const [rounds, setRounds] = useState<YesterdayScoutRound[]>([]);
  const [selected, setSelected] = useState<YesterdayScoutRound | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    if (!hasSupabaseEnv()) {
      const list = dedupeByGreenhouse(filterRoundsStartedYesterday(demoRounds));
      setRounds(list);
      setLoading(false);
      return;
    }
    const { from, to } = yesterdayWindow();
    const { data, error } = await listScoutingRoundsBetween(from, to);
    if (error || !data?.length) {
      const fallback = await listScoutingRounds(100);
      const list = dedupeByGreenhouse(
        filterRoundsStartedYesterday(fallback.data ?? []),
      );
      setRounds(list);
    } else {
      setRounds(dedupeByGreenhouse(filterRoundsStartedYesterday(data)));
    }
    setLoading(false);
  }, [demoRounds]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeScouting(() => {
    void load();
  });

  if (selected) {
    return (
      <ScoutingRoundReportDetail round={selected} onBack={() => setSelected(null)} />
    );
  }

  return (
    <section className="glass-card space-y-4 rounded-2xl p-4 sm:p-5">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Scouted yesterday</h2>
          <p className="text-sm text-muted-foreground">
            {yesterdayLabel()} — tap a greenhouse for the full scouting report.
          </p>
        </div>
        {!loading && rounds.length > 0 ? (
          <Badge variant="outline">{rounds.length} house{rounds.length === 1 ? "" : "s"}</Badge>
        ) : null}
      </header>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : rounds.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No scouting rounds started yesterday. Completed walks will appear here for managers
          each morning.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rounds.map((round) => (
            <li key={round.roundId}>
              <button
                type="button"
                onClick={() => setSelected(round)}
                className={cn(
                  "flex h-full w-full flex-col rounded-xl border border-border bg-background/60 p-4 text-left transition-colors",
                  "hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                      <Leaf className="size-4" />
                    </span>
                    <div>
                      <p className="font-semibold leading-tight">{round.greenhouseName}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {formatStarGreenhouseLabel(round.greenhouseName)}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Scout</dt>
                    <dd className="font-medium">{round.scoutName}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Time</dt>
                    <dd className="font-medium">
                      {format(new Date(round.startedAt), "HH:mm")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Stops</dt>
                    <dd className="font-medium">{round.stopCount}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Walk</dt>
                    <dd className="font-medium">
                      {formatDuration(round.durationS)} · {formatDistance(round.distanceM)}
                    </dd>
                  </div>
                </dl>
                {round.coveragePct != null ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Coverage {round.coveragePct}%
                  </p>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
