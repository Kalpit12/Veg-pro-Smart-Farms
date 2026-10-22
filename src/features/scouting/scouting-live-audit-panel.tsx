"use client";

import { format, formatDistanceToNow } from "date-fns";
import { ClipboardCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { LivePulseDot } from "@/components/ui/live-pulse-dot";
import { PhotoEvidenceLink } from "@/features/evidence/photo-evidence-link";
import { useScoutingRounds } from "@/hooks/use-scouting-data";
import { samplingTargetForGreenhouse } from "@/lib/scout-sampling";
import { formatDistance, formatDuration, durationSeconds } from "@/lib/route-metrics";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { listRecordsForRound } from "@/services/supabase/scouting-round-service";
import { useScoutingStore } from "@/store/scouting-store";

type RoundPhoto = { id: string; imageUrl: string; columnNo: number; bayNo: number };

const LIVE_PHOTO_POLL_MS = 12_000;
const LIVE_CLOCK_TICK_MS = 30_000;
const LIVE_ROUND_POLL_MS = 15_000;

function useRoundPhotos(roundId: string, status: string, refreshKey: number) {
  const [photos, setPhotos] = useState<RoundPhoto[]>([]);
  const demoRecords = useScoutingStore((s) => s.demoRecords);

  const loadPhotos = useCallback(() => {
    if (status !== "active") {
      setPhotos([]);
      return;
    }
    if (!hasSupabaseEnv()) {
      setPhotos(
        demoRecords
          .filter((r) => r.roundId === roundId && r.imageUrl)
          .slice(0, 5)
          .map((r) => ({
            id: r.id,
            imageUrl: r.imageUrl!,
            columnNo: r.columnNo,
            bayNo: r.bayNo,
          })),
      );
      return;
    }
    void listRecordsForRound(roundId).then(({ data }) => {
      const withPhoto = (data ?? [])
        .filter((r) => r.image_url)
        .slice(0, 5)
        .map((r) => ({
          id: r.id,
          imageUrl: r.image_url as string,
          columnNo: r.column_no,
          bayNo: r.bay_no,
        }));
      setPhotos(withPhoto);
    });
  }, [roundId, status, demoRecords]);

  useEffect(() => {
    loadPhotos();
    if (status !== "active") return;
    const id = window.setInterval(loadPhotos, LIVE_PHOTO_POLL_MS);
    return () => window.clearInterval(id);
  }, [loadPhotos, status, refreshKey]);

  return photos;
}

function ActiveRoundAuditRow({
  round,
  now,
  refreshKey,
}: {
  now: Date;
  refreshKey: number;
  round: {
    id: string;
    status: string;
    scoutName: string;
    greenhouseName: string;
    startedAt: string;
    stopCount: number;
    durationS: number | null;
    distanceM: number;
    coveragePct: number | null;
  };
}) {
  const sample = samplingTargetForGreenhouse(round.greenhouseName);
  const elapsed =
    round.durationS ?? durationSeconds(round.startedAt, now.toISOString());
  const progress = Math.min(
    100,
    Math.round((round.stopCount / Math.max(1, sample.targetStops)) * 100),
  );
  const underSampled = round.stopCount < sample.targetStops;
  const photos = useRoundPhotos(round.id, round.status, refreshKey);

  return (
    <li className="space-y-2 px-3 py-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">
            {round.scoutName} · {round.greenhouseName}
          </p>
          <p className="text-xs text-muted-foreground">
            Started{" "}
            {formatDistanceToNow(new Date(round.startedAt), {
              addSuffix: true,
              now,
            })}{" "}
            · {format(new Date(round.startedAt), "MMM d, HH:mm")}
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">
              {round.stopCount}/{sample.targetStops}
            </span>{" "}
            stops · {progress}% sample
            {underSampled ? (
              <Badge variant="warning" className="ml-2">
                Under-sampled
              </Badge>
            ) : (
              <Badge variant="outline" className="ml-2">
                On target
              </Badge>
            )}
          </p>
          <p>
            {formatDuration(elapsed)} · {formatDistance(round.distanceM)}
            {round.coveragePct != null ? ` · ${round.coveragePct}% coverage` : ""}
          </p>
        </div>
      </div>
      {photos.length ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-2 text-xs">
          <span className="text-muted-foreground">Evidence:</span>
          {photos.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1">
              C{p.columnNo}×B{p.bayNo}
              <PhotoEvidenceLink path={p.imageUrl} />
            </span>
          ))}
        </div>
      ) : (
        <p className="border-t border-border/60 pt-2 text-xs text-muted-foreground">
          No stop photos yet this round.
        </p>
      )}
    </li>
  );
}

export function ScoutingLiveAuditPanel() {
  const { rounds, refresh } = useScoutingRounds(40);
  const active = rounds.filter((r) => r.status === "active");
  const [now, setNow] = useState(() => new Date());
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [refreshKey, setRefreshKey] = useState(0);

  const pullLive = useCallback(async () => {
    await refresh();
    setLastUpdated(new Date());
    setRefreshKey((k) => k + 1);
  }, [refresh]);

  useEffect(() => {
    setLastUpdated(new Date());
  }, [rounds]);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), LIVE_CLOCK_TICK_MS);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!active.length) return;
    const poll = window.setInterval(() => {
      void pullLive();
    }, LIVE_ROUND_POLL_MS);
    return () => window.clearInterval(poll);
  }, [active.length, pullLive]);

  return (
    <section className="glass-card space-y-3 rounded-2xl p-4" data-testid="live-scout-audit">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <ClipboardCheck className="mt-0.5 size-4 text-primary" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">Live scout audit</h2>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                <LivePulseDot />
                Live
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Who is in a house now — stops, sample progress, and photo evidence.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {format(now, "EEEE, MMM d, yyyy")}
              </span>
              {" · "}
              Data refreshed {format(lastUpdated, "HH:mm:ss")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="success" className="tabular-nums">
            {format(now, "HH:mm")}
          </Badge>
          <Badge variant={active.length ? "warning" : "outline"}>
            {active.length} active
          </Badge>
        </div>
      </div>

      {!active.length ? (
        <p className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
          No scouts are tracking right now. When a worker taps Start Scouting, their
          round appears here for manager ride-along checks.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {active.map((round) => (
            <ActiveRoundAuditRow
              key={round.id}
              round={round}
              now={now}
              refreshKey={refreshKey}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
