"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Pause, Play, RotateCcw } from "lucide-react";

import { AppSelect } from "@/components/ui/app-select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoutRoute3DView } from "@/features/scouting/scout-route-3d-view";
import { ScoutingAiInsightsPanel } from "@/features/scouting/scouting-ai-insights-panel";
import { routeSummaryFromDemo, type ScoutRouteStop } from "@/lib/scout-route";
import { buildCoverageModel, suggestNextCells } from "@/lib/scouting-coverage";
import { coverageGridForGreenhouse } from "@/lib/bemack-master-data";
import { analyzeScoutingRound } from "@/lib/scouting-ai-insights";
import {
  formatDistance,
  formatDuration,
  durationSeconds,
} from "@/lib/route-metrics";
import { useRealtimeScouting } from "@/hooks/use-realtime-scouting";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { isUuid } from "@/lib/uuid";
import { useScoutingData } from "@/hooks/use-scouting-data";
import {
  listRecordsForRound,
  listScoutingRounds,
  type ScoutingRoundRow,
} from "@/services/supabase/scouting-round-service";
import { listRoutePoints, listRoutePointsForRounds } from "@/services/supabase/scouting-route-service";
import { useScoutingStore } from "@/store/scouting-store";
import { cn } from "@/lib/utils";
import type { TrackPoint } from "@/features/scouting/scout-route-map-view";

const RouteMapView = dynamic(
  () => import("@/features/scouting/scout-route-map-view").then((m) => m.ScoutRouteMapView),
  { ssr: false, loading: () => <Skeleton className="h-80 w-full rounded-2xl" /> },
);

function stopsFromUnified(
  records: {
    id: string;
    latitude: number | null;
    longitude: number | null;
    recordedAt: string;
    greenhouseName: string;
    columnNo: number;
    bayNo: number;
    scoutName: string;
    issue: string;
    rating: number | null;
  }[],
): ScoutRouteStop[] {
  return records
    .filter((r) => r.columnNo > 0 && r.bayNo > 0)
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
    .map((r) => ({
      id: r.id,
      greenhouseName: r.greenhouseName,
      columnNo: r.columnNo,
      bayNo: r.bayNo,
      lat: r.latitude,
      lng: r.longitude,
      recordedAt: r.recordedAt,
      label: `${r.greenhouseName} · Col ${r.columnNo} Bay ${r.bayNo}`,
      scoutName: r.scoutName,
      issue: r.issue,
      rating: r.rating,
    }));
}

type ViewMode = "greenhouse" | "gps";

export function ScoutRouteMap() {
  const searchParams = useSearchParams();
  const roundFromUrl = searchParams.get("round");
  const demoRounds = useScoutingStore((s) => s.demoRounds);
  const demoRecords = useScoutingStore((s) => s.demoRecords);
  const demoRoutePoints = useScoutingStore((s) => s.demoRoutePoints);
  useScoutingData(7);
  const [remoteRounds, setRemoteRounds] = useState<ScoutingRoundRow[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string>(() => {
    if (roundFromUrl) return roundFromUrl;
    if (hasSupabaseEnv()) return "";
    return useScoutingStore.getState().demoRounds[0]?.id ?? "";
  });
  const [remoteStops, setRemoteStops] = useState<ScoutRouteStop[]>([]);
  const [remoteTrack, setRemoteTrack] = useState<TrackPoint[]>([]);
  const [aggregateHeat, setAggregateHeat] = useState<TrackPoint[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("gps");
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [replayIndex, setReplayIndex] = useState<number | null>(null);
  const [replaying, setReplaying] = useState(false);
  const [showHeat, setShowHeat] = useState(false);

  useEffect(() => {
    if (roundFromUrl) setSelectedRoundId(roundFromUrl);
  }, [roundFromUrl]);

  const loadRounds = useCallback(async () => {
    if (!hasSupabaseEnv()) return;
    const { data } = await listScoutingRounds(30);
    const rounds = (data as ScoutingRoundRow[]) ?? [];
    setRemoteRounds(rounds);
    if (rounds[0]) {
      setSelectedRoundId((prev) => {
        if (roundFromUrl && rounds.some((r) => r.id === roundFromUrl)) {
          return roundFromUrl;
        }
        return isUuid(prev) && rounds.some((r) => r.id === prev)
          ? prev
          : rounds[0].id;
      });
    }
  }, [roundFromUrl]);

  useEffect(() => {
    void loadRounds();
  }, [loadRounds, demoRecords.length]);

  const reloadRoundData = useCallback(() => {
    if (!hasSupabaseEnv() || !isUuid(selectedRoundId)) return;
    void listRecordsForRound(selectedRoundId).then(({ data, error }) => {
      if (error) {
        setRemoteStops([]);
        return;
      }
      const rows =
        data?.map((r) => ({
          id: r.id,
          latitude: r.latitude,
          longitude: r.longitude,
          recordedAt: r.recorded_at,
          greenhouseName: (r.greenhouses as { name?: string })?.name ?? "—",
          columnNo: r.column_no,
          bayNo: r.bay_no,
          scoutName: "Scout",
          issue: r.issue_name,
          rating: r.rating,
        })) ?? [];
      setRemoteStops(stopsFromUnified(rows));
    });
    void listRoutePoints(selectedRoundId).then(({ data }) => {
      setRemoteTrack(
        (data ?? []).map((p) => ({
          lat: p.latitude,
          lng: p.longitude,
          recordedAt: p.recorded_at,
        })),
      );
    });
  }, [selectedRoundId]);

  useRealtimeScouting(() => {
    void loadRounds();
    reloadRoundData();
  });

  useEffect(() => {
    reloadRoundData();
  }, [reloadRoundData, demoRecords.length, demoRoutePoints.length]);

  const demoRoundList = demoRounds.filter((r) => r.status === "completed" || r.status === "active");

  const effectiveRoundId = hasSupabaseEnv()
    ? selectedRoundId
    : selectedRoundId || demoRoundList[0]?.id || "";

  const trackPoints: TrackPoint[] = useMemo(() => {
    if (hasSupabaseEnv()) return remoteTrack;
    return demoRoutePoints
      .filter((p) => p.roundId === effectiveRoundId)
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
      .map((p) => ({ lat: p.latitude, lng: p.longitude, recordedAt: p.recordedAt }));
  }, [effectiveRoundId, remoteTrack, demoRoutePoints]);

  const heatPoints: TrackPoint[] = useMemo(() => {
    if (!showHeat) return [];
    if (hasSupabaseEnv()) return aggregateHeat.length ? aggregateHeat : remoteTrack;
    return demoRoutePoints.map((p) => ({
      lat: p.latitude,
      lng: p.longitude,
      recordedAt: p.recordedAt,
    }));
  }, [showHeat, aggregateHeat, remoteTrack, demoRoutePoints]);

  useEffect(() => {
    if (!showHeat || !hasSupabaseEnv() || !remoteRounds.length) {
      setAggregateHeat([]);
      return;
    }
    const ids = remoteRounds.slice(0, 12).map((r) => r.id);
    void listRoutePointsForRounds(ids).then(({ data }) => {
      setAggregateHeat(
        (data ?? []).map((p) => ({
          lat: p.latitude,
          lng: p.longitude,
          recordedAt: p.recorded_at,
        })),
      );
    });
  }, [showHeat, remoteRounds]);

  const summary = useMemo(() => {
    if (hasSupabaseEnv()) {
      const round = remoteRounds.find((r) => r.id === effectiveRoundId);
      if (!round) return null;
      const durationS =
        round.duration_s ??
        (round.ended_at ? durationSeconds(round.started_at, round.ended_at) : null);
      return {
        scoutName: round.users?.full_name ?? "Scout",
        greenhouseName: round.greenhouses?.name ?? "—",
        startedAt: round.started_at,
        endedAt: round.ended_at,
        status: round.status,
        stopCount: round.stop_count,
        distanceM: Number(round.distance_m ?? 0),
        durationS,
        coveragePct: round.coverage_pct != null ? Number(round.coverage_pct) : null,
        pointCount: round.point_count ?? trackPoints.length,
        stops: remoteStops,
      };
    }
    const round = demoRoundList.find((r) => r.id === effectiveRoundId);
    if (!round) return null;
    const base = routeSummaryFromDemo(round, demoRecords);
    return {
      ...base,
      distanceM: round.distanceM ?? 0,
      durationS:
        round.durationS ??
        (round.endedAt ? durationSeconds(round.startedAt, round.endedAt) : null),
      coveragePct: round.coveragePct ?? null,
      pointCount: round.pointCount ?? trackPoints.length,
    };
  }, [
    effectiveRoundId,
    demoRoundList,
    demoRecords,
    remoteRounds,
    remoteStops,
    trackPoints.length,
  ]);

  const coverage = useMemo(() => {
    if (!summary) return null;
    return buildCoverageModel({
      greenhouseName: summary.greenhouseName,
      stops: summary.stops.map((s) => ({
        columnNo: s.columnNo,
        bayNo: s.bayNo,
        latitude: s.lat,
        longitude: s.lng,
      })),
      routePoints: trackPoints.map((p) => ({
        latitude: p.lat,
        longitude: p.lng,
      })),
      ...coverageGridForGreenhouse(summary.greenhouseName),
    });
  }, [summary, trackPoints]);

  const suggested = useMemo(
    () => (coverage ? suggestNextCells(coverage, 6) : []),
    [coverage],
  );

  const aiReport = useMemo(() => {
    if (!summary) return null;
    return analyzeScoutingRound({
      distanceM: summary.distanceM,
      durationS: summary.durationS ?? 0,
      stopCount: summary.stops.length,
      pointCount: summary.pointCount,
      coverage,
      stops: summary.stops.map((s) => ({
        issue: s.issue,
        rating: s.rating,
        recordedAt: s.recordedAt,
        columnNo: s.columnNo,
        bayNo: s.bayNo,
      })),
      routePoints: trackPoints.map((p) => ({
        latitude: p.lat,
        longitude: p.lng,
        recordedAt: p.recordedAt,
      })),
    });
  }, [summary, coverage, trackPoints]);

  const gpsCenter = useMemo(() => {
    if (trackPoints.length) {
      const mid = trackPoints[Math.floor(trackPoints.length / 2)];
      return { lat: mid.lat, lng: mid.lng };
    }
    const gpsStops = (summary?.stops ?? []).filter((s) => s.lat != null && s.lng != null);
    if (!gpsStops.length) return { lat: -1.2921, lng: 36.8219 };
    const lat = gpsStops.reduce((s, p) => s + p.lat!, 0) / gpsStops.length;
    const lng = gpsStops.reduce((s, p) => s + p.lng!, 0) / gpsStops.length;
    return { lat, lng };
  }, [summary, trackPoints]);

  const hasStops = (summary?.stops.length ?? 0) > 0;
  const hasTrack = trackPoints.length > 0;
  const hasGps =
    hasTrack || (summary?.stops ?? []).some((s) => s.lat != null && s.lng != null);
  const hasContent = hasStops || hasTrack;

  useEffect(() => {
    if (hasGps && viewMode === "gps") setMapReady(true);
  }, [hasGps, viewMode]);

  useEffect(() => {
    setActiveStopId(null);
    setReplayIndex(null);
    setReplaying(false);
  }, [effectiveRoundId]);

  useEffect(() => {
    if (!replaying || !trackPoints.length) return;
    const id = window.setInterval(() => {
      setReplayIndex((prev) => {
        const next = (prev ?? -1) + 1;
        if (next >= trackPoints.length) {
          setReplaying(false);
          return trackPoints.length - 1;
        }
        return next;
      });
    }, 280);
    return () => window.clearInterval(id);
  }, [replaying, trackPoints.length]);

  return (
    <section className="glass-card space-y-4 rounded-2xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Scout routes</h2>
          <p className="text-sm text-muted-foreground">
            Strava-style GPS track with start, finish, and observation pins.
          </p>
        </div>
        <AppSelect
          aria-label="Scout round"
          className="w-full min-w-[12rem] sm:w-72"
          value={effectiveRoundId}
          onChange={setSelectedRoundId}
          options={
            hasSupabaseEnv()
              ? remoteRounds.map((r) => ({
                  value: r.id,
                  label: `${r.greenhouses?.name ?? "GH"} · ${format(new Date(r.started_at), "MMM d HH:mm")}`,
                }))
              : demoRoundList.map((r) => ({
                  value: r.id,
                  label: `${r.greenhouseName} · ${format(new Date(r.startedAt), "MMM d HH:mm")}`,
                }))
          }
          placeholder="Select round…"
        />
      </div>

      {summary ? (
        <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <dt className="text-xs text-muted-foreground">Scout</dt>
            <dd className="font-medium">{summary.scoutName}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Distance</dt>
            <dd className="font-medium">{formatDistance(summary.distanceM)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Duration</dt>
            <dd className="font-medium">{formatDuration(summary.durationS)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Observations</dt>
            <dd className="font-medium">{summary.stops.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Coverage</dt>
            <dd className="font-medium">
              {summary.coveragePct != null
                ? `${summary.coveragePct}%`
                : coverage
                  ? `${coverage.coveragePct}%`
                  : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Greenhouse</dt>
            <dd className="font-medium">{summary.greenhouseName}</dd>
          </div>
        </dl>
      ) : null}

      {hasContent ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={viewMode === "greenhouse" ? "default" : "outline"}
            onClick={() => setViewMode("greenhouse")}
            disabled={!hasStops}
          >
            Greenhouse 3D
          </Button>
          <Button
            type="button"
            size="sm"
            variant={viewMode === "gps" ? "default" : "outline"}
            disabled={!hasGps}
            onClick={() => setViewMode("gps")}
          >
            GPS track
          </Button>
          <Button
            type="button"
            size="sm"
            variant={showHeat ? "default" : "outline"}
            disabled={!hasGps}
            onClick={() => setShowHeat((v) => !v)}
          >
            Heat overlay
          </Button>
        </div>
      ) : null}

      {hasStops && viewMode === "greenhouse" ? (
        <ScoutRoute3DView
          greenhouseName={summary?.greenhouseName ?? "Greenhouse"}
          stops={summary?.stops ?? []}
          activeStopId={activeStopId}
          onSelectStop={setActiveStopId}
        />
      ) : null}

      {hasContent && viewMode === "gps" && mapReady ? (
        <div className="space-y-3">
          <RouteMapView
            center={gpsCenter}
            stops={summary?.stops ?? []}
            trackPoints={trackPoints}
            replayIndex={replayIndex}
            heatPoints={heatPoints}
          />
          {trackPoints.length > 1 ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setReplayIndex(0);
                  setReplaying(true);
                }}
              >
                <Play className="mr-1 size-3.5" />
                Replay
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!replaying}
                onClick={() => setReplaying(false)}
              >
                <Pause className="mr-1 size-3.5" />
                Pause
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setReplaying(false);
                  setReplayIndex(null);
                }}
              >
                <RotateCcw className="mr-1 size-3.5" />
                Reset
              </Button>
              {replayIndex != null ? (
                <span className="text-xs text-muted-foreground">
                  Point {replayIndex + 1} / {trackPoints.length}
                  {trackPoints[replayIndex]?.recordedAt
                    ? ` · ${format(new Date(trackPoints[replayIndex].recordedAt!), "HH:mm:ss")}`
                    : ""}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : hasContent && viewMode === "gps" ? (
        <Skeleton className="h-80 w-full rounded-2xl" />
      ) : null}

      {!hasContent ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No GPS track or stops for this round. Start scouting in the field app.
        </p>
      ) : null}

      {suggested.length ? (
        <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
          <p className="font-medium">Suggested next cells</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Optimized to cover missed column×bay cells near the walked path.
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {suggested.map((c) => (
              <li
                key={`${c.columnNo}-${c.bayNo}`}
                className="rounded-lg bg-background px-2 py-1 text-xs font-medium"
              >
                Col {c.columnNo} · Bay {c.bayNo}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {aiReport ? <ScoutingAiInsightsPanel report={aiReport} /> : null}

      {hasStops ? (
        <ol className="max-h-40 space-y-1 overflow-y-auto text-sm">
          {summary?.stops.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                className={cn(
                  "flex w-full justify-between gap-2 rounded-lg px-2 py-1 text-left transition-colors",
                  activeStopId === s.id ? "bg-primary/10" : "bg-muted/30 hover:bg-muted/50",
                )}
                onClick={() => setActiveStopId(s.id)}
              >
                <span>
                  {i + 1}. {s.issue} — {s.label}
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {format(new Date(s.recordedAt), "HH:mm")}
                </span>
              </button>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
