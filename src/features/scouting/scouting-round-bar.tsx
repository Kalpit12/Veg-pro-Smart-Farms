"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, Play, Square, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useScoutingRouteTracker } from "@/hooks/use-scouting-route-tracker";
import { buildCoverageModel } from "@/lib/scouting-coverage";
import { BEMACK_DEMO_LOCATIONS, coverageGridForGreenhouse } from "@/lib/bemack-master-data";
import { distanceBetweenPoints, durationSeconds, formatDistance, formatDuration } from "@/lib/route-metrics";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { getCurrentUser } from "@/services/supabase/auth-service";
import {
  getAnyActiveRoundForScout,
  startScoutingRound,
  type ScoutingRoundRow,
} from "@/services/supabase/scouting-round-service";
import { finalizeRoundMetrics } from "@/services/supabase/scouting-route-service";
import { useScanStore } from "@/store/scan-store";
import { useScoutingStore } from "@/store/scouting-store";
import { useScoutingRouteBufferStore } from "@/store/scouting-route-buffer-store";
import { useScoutingSessionStore } from "@/store/scouting-session-store";

const LiveRouteMiniMap = dynamic(
  () =>
    import("@/features/scouting/live-route-mini-map").then((m) => m.LiveRouteMiniMap),
  { ssr: false, loading: () => <Skeleton className="h-40 w-full rounded-xl" /> },
);

function greenhouseMeta(greenhouseId: string, farmId: string) {
  const loc = BEMACK_DEMO_LOCATIONS.find((l) => l.greenhouseId === greenhouseId);
  return {
    farmId: loc?.farmId ?? farmId,
    farmName: loc?.farmName ?? "Farm",
    greenhouseId,
    greenhouseName: loc?.greenhouseName ?? "Greenhouse",
  };
}

export function ScoutingRoundBar() {
  const { toast } = useToast();
  const scan = useScanStore();
  const setContext = useScanStore((s) => s.setContext);
  const demoRounds = useScoutingStore((s) => s.demoRounds);
  const demoRecords = useScoutingStore((s) => s.demoRecords);
  const demoRoutePoints = useScoutingStore((s) => s.demoRoutePoints);
  const activeRoundId = useScoutingStore((s) => s.activeRoundId);
  const startDemoRound = useScoutingStore((s) => s.startDemoRound);
  const completeDemoRound = useScoutingStore((s) => s.completeDemoRound);
  const getPointsForRound = useScoutingRouteBufferStore((s) => s.getPointsForRound);
  const clearBufferRound = useScoutingRouteBufferStore((s) => s.clearRound);
  const session = useScoutingSessionStore((s) => s.session);
  const setSession = useScoutingSessionStore((s) => s.setSession);
  const clearSession = useScoutingSessionStore((s) => s.clearSession);
  const [remoteRound, setRemoteRound] = useState<ScoutingRoundRow | null>(null);
  const [finishing, setFinishing] = useState(false);

  const bindRemoteRound = useCallback(
    (round: ScoutingRoundRow) => {
      setRemoteRound(round);
      const meta = greenhouseMeta(round.greenhouse_id, round.farm_id);
      const greenhouseName =
        round.greenhouses?.name ?? meta.greenhouseName;
      const farmName = round.farms?.name ?? meta.farmName;
      setSession({
        roundId: round.id,
        farmId: round.farm_id,
        farmName,
        greenhouseId: round.greenhouse_id,
        greenhouseName,
        startedAt: round.started_at,
      });
      setContext({
        farmId: round.farm_id,
        farmName,
        greenhouseId: round.greenhouse_id,
        greenhouseName,
      });
    },
    [setSession, setContext],
  );

  const loadRemote = useCallback(async () => {
    if (!hasSupabaseEnv()) return;
    const user = await getCurrentUser();
    if (!user) return;
    // Load ANY active round for this scout — do not key off current GPS greenhouse
    const { data } = await getAnyActiveRoundForScout(user.id);
    if (data) {
      bindRemoteRound(data as ScoutingRoundRow);
    } else {
      setRemoteRound(null);
      // Only clear if store still points at a finished/missing round
      const current = useScoutingSessionStore.getState().session;
      if (current) clearSession();
    }
  }, [bindRemoteRound, clearSession]);

  useEffect(() => {
    void loadRemote();
    // Re-check when greenhouse changes only if we have no session yet
  }, [loadRemote]);

  // If GPS greenhouse flips but session exists, re-pin context (do not reload as null)
  useEffect(() => {
    if (!session) return;
    setContext({
      farmId: session.farmId,
      farmName: session.farmName,
      greenhouseId: session.greenhouseId,
      greenhouseName: session.greenhouseName,
    });
  }, [session, setContext, scan.greenhouseId]);

  const activeRound = useMemo(() => {
    if (hasSupabaseEnv() && remoteRound) {
      return {
        id: remoteRound.id,
        stopCount: remoteRound.stop_count,
        greenhouseName:
          session?.greenhouseName ??
          remoteRound.greenhouses?.name ??
          scan.greenhouseName ??
          "—",
        startedAt: remoteRound.started_at,
      };
    }
    if (session && hasSupabaseEnv()) {
      return {
        id: session.roundId,
        stopCount: remoteRound?.stop_count ?? 0,
        greenhouseName: session.greenhouseName,
        startedAt: session.startedAt,
      };
    }
    if (!activeRoundId) return null;
    const r = demoRounds.find((x) => x.id === activeRoundId && x.status === "active");
    if (!r) return null;
    return {
      id: r.id,
      stopCount: r.stopCount,
      greenhouseName: r.greenhouseName,
      startedAt: r.startedAt,
    };
  }, [activeRoundId, demoRounds, remoteRound, scan.greenhouseName, session]);

  const tracker = useScoutingRouteTracker(activeRound?.id ?? null);
  const canStart = (scan.farmId && scan.greenhouseId) || !!session;

  const handleStart = async () => {
    if (!canStart && !scan.greenhouseId) return;

    if (!hasSupabaseEnv()) {
      const id = startDemoRound({
        scoutName: "Demo Scout",
        farmId: scan.farmId!,
        greenhouseId: scan.greenhouseId!,
        greenhouseName: scan.greenhouseName ?? "Greenhouse",
      });
      setSession({
        roundId: id,
        farmId: scan.farmId!,
        farmName: scan.farmName ?? "Farm",
        greenhouseId: scan.greenhouseId!,
        greenhouseName: scan.greenhouseName ?? "Greenhouse",
        startedAt: new Date().toISOString(),
      });
      toast({
        title: "Scouting started",
        description: "GPS route is recording. Greenhouse stays locked until you finish.",
        tone: "success",
      });
      return;
    }

    try {
      const user = await getCurrentUser();
      if (!user) {
        toast({ title: "Not signed in", tone: "error" });
        return;
      }

      const existing = await getAnyActiveRoundForScout(user.id);
      if (existing.data) {
        bindRemoteRound(existing.data as ScoutingRoundRow);
        toast({
          title: "Resumed active scouting",
          description: "GPS tracking continues — finish when done.",
          tone: "success",
        });
        return;
      }

      const { data, error } = await startScoutingRound({
        scout_id: user.id,
        farm_id: scan.farmId!,
        greenhouse_id: scan.greenhouseId!,
      });
      if (error) throw error;
      bindRemoteRound(data as ScoutingRoundRow);
      toast({
        title: "Scouting started",
        description: "Greenhouse is locked for this round. Finish to change house.",
        tone: "success",
      });
    } catch (e) {
      toast({
        title: "Could not start scouting",
        description: e instanceof Error ? e.message : "Unknown error",
        tone: "error",
      });
    }
  };

  const handleComplete = async () => {
    if (!activeRound) return;
    setFinishing(true);
    try {
      await tracker.flush();

      const bufferPoints = getPointsForRound(activeRound.id);
      const demoPoints = demoRoutePoints.filter((p) => p.roundId === activeRound.id);
      const routePts = hasSupabaseEnv()
        ? bufferPoints
        : [...demoPoints, ...bufferPoints.filter((b) => !demoPoints.some((d) => d.id === b.id))];

      const stops = demoRecords
        .filter((r) => r.roundId === activeRound.id)
        .map((r) => ({
          columnNo: r.columnNo,
          bayNo: r.bayNo,
          latitude: r.latitude,
          longitude: r.longitude,
        }));

      const coverage = buildCoverageModel({
        greenhouseName: activeRound.greenhouseName,
        stops,
        routePoints: routePts.map((p) => ({
          latitude: p.latitude,
          longitude: p.longitude,
        })),
        ...coverageGridForGreenhouse(activeRound.greenhouseName),
      });

      const distanceM = distanceBetweenPoints(
        routePts.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
      );
      const durationS = durationSeconds(activeRound.startedAt);

      if (!hasSupabaseEnv()) {
        completeDemoRound(activeRound.id, {
          distanceM,
          durationS,
          pointCount: routePts.length,
          coveragePct: coverage.coveragePct,
        });
        clearBufferRound(activeRound.id);
        clearSession();
        toast({
          title: "Scouting finished",
          description: `${formatDistance(distanceM)} · ${formatDuration(durationS)} · ${coverage.coveragePct}% coverage`,
          tone: "success",
        });
        return;
      }

      const { error } = await finalizeRoundMetrics(activeRound.id, {
        coveragePct: coverage.coveragePct,
      });
      if (error) throw error;
      clearBufferRound(activeRound.id);
      setRemoteRound(null);
      clearSession();
      toast({
        title: "Scouting finished",
        description: `${formatDistance(distanceM)} · ${formatDuration(durationS)} · ${coverage.coveragePct}% coverage`,
        tone: "success",
      });
    } catch (e) {
      toast({
        title: "Could not finish scouting",
        description: e instanceof Error ? e.message : "Unknown error",
        tone: "error",
      });
    } finally {
      setFinishing(false);
    }
  };

  const geofenceMessage = tracker.geofenceAnchorMismatch
    ? "Map greenhouse anchors don’t match your live GPS farm location. Tracking continues — finish when done."
    : tracker.geofenceOutside
      ? "You appear outside the assigned greenhouse geofence. Tracking continues — confirm you are in the correct house."
      : null;

  return (
    <div className="rounded-2xl border border-border bg-card/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-primary" />
          <div>
            <p className="text-sm font-semibold">Smart Scouting Tracker</p>
            <p className="text-xs text-muted-foreground">
              Start GPS tracking, walk the greenhouse, add observations, then finish.
            </p>
          </div>
        </div>
        {activeRound ? (
          <Badge variant="warning">
            Active · {activeRound.stopCount} obs · {activeRound.greenhouseName}
          </Badge>
        ) : (
          <Badge variant="outline">Not tracking</Badge>
        )}
      </div>

      {activeRound ? (
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div className="rounded-xl bg-muted/40 px-3 py-2">
            <p className="text-xs text-muted-foreground">Distance</p>
            <p className="font-semibold">{tracker.formatLiveDistance}</p>
          </div>
          <div className="rounded-xl bg-muted/40 px-3 py-2">
            <p className="text-xs text-muted-foreground">Duration</p>
            <p className="font-semibold">{tracker.formatLiveDuration}</p>
          </div>
          <div className="rounded-xl bg-muted/40 px-3 py-2">
            <p className="text-xs text-muted-foreground">Track points</p>
            <p className="font-semibold">{tracker.livePath.length}</p>
          </div>
          <div className="rounded-xl bg-muted/40 px-3 py-2">
            <p className="text-xs text-muted-foreground">GPS accuracy</p>
            <p className="font-semibold">
              {tracker.lastSample?.accuracyM != null
                ? `±${Math.round(tracker.lastSample.accuracyM)} m`
                : "—"}
            </p>
          </div>
        </div>
      ) : null}

      {tracker.gpsStabilityHint ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-950 dark:text-sky-100">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {tracker.gpsStabilityHint}
        </p>
      ) : null}

      {geofenceMessage ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {geofenceMessage}
        </p>
      ) : null}

      {activeRound && tracker.livePath.length > 0 ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-border">
          <LiveRouteMiniMap path={tracker.livePath} />
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={(!canStart && !scan.greenhouseId) || !!activeRound}
          onClick={() => void handleStart()}
        >
          <Play className="mr-1 size-3.5" />
          Start Scouting
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!activeRound || finishing}
          onClick={() => void handleComplete()}
        >
          <Square className="mr-1 size-3.5" />
          {finishing ? "Finishing…" : "Finish Scouting"}
        </Button>
      </div>
    </div>
  );
}
