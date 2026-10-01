"use client";

import { formatDistanceToNow } from "date-fns";
import { ClipboardCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { PhotoEvidenceLink } from "@/features/evidence/photo-evidence-link";
import { useScoutingRounds } from "@/hooks/use-scouting-data";
import { samplingTargetForGreenhouse } from "@/lib/scout-sampling";
import { formatDistance, formatDuration, durationSeconds } from "@/lib/route-metrics";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { listRecordsForRound } from "@/services/supabase/scouting-round-service";
import { useScoutingStore } from "@/store/scouting-store";

type RoundPhoto = { id: string; imageUrl: string; columnNo: number; bayNo: number };

function useRoundPhotos(roundId: string, status: string) {
  const [photos, setPhotos] = useState<RoundPhoto[]>([]);
  const demoRecords = useScoutingStore((s) => s.demoRecords);

  useEffect(() => {
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
    let cancelled = false;
    void listRecordsForRound(roundId).then(({ data }) => {
      if (cancelled) return;
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
    return () => {
      cancelled = true;
    };
  }, [roundId, status, demoRecords]);

  return photos;
}

function ActiveRoundAuditRow({
  round,
}: {
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
  const elapsed = round.durationS ?? durationSeconds(round.startedAt);
  const progress = Math.min(
    100,
    Math.round((round.stopCount / Math.max(1, sample.targetStops)) * 100),
  );
  const underSampled = round.stopCount < sample.targetStops;
  const photos = useRoundPhotos(round.id, round.status);

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
            })}
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
  const { rounds } = useScoutingRounds(40);
  const active = rounds.filter((r) => r.status === "active");

  return (
    <section className="glass-card space-y-3 rounded-2xl p-4" data-testid="live-scout-audit">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="size-4 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Live scout audit</h2>
            <p className="text-sm text-muted-foreground">
              Who is in a house now — stops, sample progress, and photo evidence.
            </p>
          </div>
        </div>
        <Badge variant={active.length ? "warning" : "outline"}>
          {active.length} active
        </Badge>
      </div>

      {!active.length ? (
        <p className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
          No scouts are tracking right now. When a worker taps Start Scouting, their
          round appears here for manager ride-along checks.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {active.map((round) => (
            <ActiveRoundAuditRow key={round.id} round={round} />
          ))}
        </ul>
      )}
    </section>
  );
}
