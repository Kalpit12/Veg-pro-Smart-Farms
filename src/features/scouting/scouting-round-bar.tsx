"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, Play, Square, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useGreenhouseAnchorsSync } from "@/hooks/use-greenhouse-anchors-sync";
import { useScoutingRouteTracker } from "@/hooks/use-scouting-route-tracker";
import { buildCoverageModel } from "@/lib/scouting-coverage";
import { coverageGridForGreenhouse } from "@/lib/bemack-master-data";
import { samplingTargetForGreenhouse } from "@/lib/scout-sampling";
import { distanceBetweenPoints, durationSeconds, formatDistance, formatDuration } from "@/lib/route-metrics";
import { hasConfiguredBackend, isOfflineDemo } from "@/lib/data-backend";
import { getCurrentUser } from "@/services/supabase/auth-service";
import {
  completeScoutingRound,
  getAnyActiveRoundForScout,
  listRecordsForRound,
  startScoutingRound,
  type ScoutingRoundRow,
} from "@/services/supabase/scouting-round-service";
import {
  pendingWalkFromDemoRound,
  pendingWalkFromSession,
  type PendingWalkInfo,
} from "@/lib/scouting-walk-pending";
import { finalizeRoundMetrics } from "@/services/supabase/scouting-route-service";
import { isLikelyOfflineError, useFieldWriteQueueStore } from "@/store/field-write-queue-store";
import { useGreenhouseAnchorStore } from "@/store/greenhouse-anchor-store";
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
  const loc = useGreenhouseAnchorStore
    .getState()
    .anchors.find((l) => l.greenhouseId === greenhouseId);
  return {
    farmId: loc?.farmId ?? farmId,
    farmName: loc?.farmName ?? "Farm",
    greenhouseId,
    greenhouseName: loc?.greenhouseName ?? "Greenhouse",
  };
}

export function ScoutingRoundBar() {
  useGreenhouseAnchorsSync();
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
  const walkEngaged = useScoutingSessionStore((s) => s.walkEngaged);
  const setSession = useScoutingSessionStore((s) => s.setSession);
  const engageWalk = useScoutingSessionStore((s) => s.engageWalk);
  const clearSession = useScoutingSessionStore((s) => s.clearSession);
  const enqueueRoundStart = useFieldWriteQueueStore((s) => s.enqueueRoundStart);
  const enqueueRoundFinish = useFieldWriteQueueStore((s) => s.enqueueRoundFinish);
  const [remoteRound, setRemoteRound] = useState<ScoutingRoundRow | null>(null);
  const [pendingRemoteRound, setPendingRemoteRound] = useState<ScoutingRoundRow | null>(
    null,
  );
  const [finishing, setFinishing] = useState(false);
  const [discarding, setDiscarding] = useState(false);

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
        stopCount: round.stop_count ?? 0,
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
    if (isOfflineDemo()) return;
    const user = await getCurrentUser();
    if (!user) return;
    // Load ANY active round for this scout — do not key off current GPS greenhouse
    const { data, error } = await getAnyActiveRoundForScout(user.id);
    if (error) return;
    if (data) {
      const row = data as ScoutingRoundRow;
      setPendingRemoteRound(row);
      const meta = greenhouseMeta(row.greenhouse_id, row.farm_id);
      setSession({
        roundId: row.id,
        farmId: row.farm_id,
        farmName: row.farms?.name ?? meta.farmName,
        greenhouseId: row.greenhouse_id,
        greenhouseName: row.greenhouses?.name ?? meta.greenhouseName,
        startedAt: row.started_at,
        stopCount: row.stop_count ?? 0,
      });
      if (useScoutingSessionStore.getState().walkEngaged) {
        bindRemoteRound(row);
      }
      return;
    }
    setPendingRemoteRound(null);
    setRemoteRound(null);
    const current = useScoutingSessionStore.getState().session;
    if (current && !current.pendingOffline) clearSession();
  }, [bindRemoteRound, clearSession, setSession]);

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

  const pendingWalk = useMemo((): PendingWalkInfo | null => {
    if (walkEngaged) return null;
    if (pendingRemoteRound) {
      const meta = greenhouseMeta(
        pendingRemoteRound.greenhouse_id,
        pendingRemoteRound.farm_id,
      );
      return {
        roundId: pendingRemoteRound.id,
        greenhouseName:
          pendingRemoteRound.greenhouses?.name ?? meta.greenhouseName,
        stopCount: pendingRemoteRound.stop_count ?? session?.stopCount ?? 0,
      };
    }
    const fromSession = pendingWalkFromSession(session);
    if (fromSession) return fromSession;
    if (isOfflineDemo() && activeRoundId) {
      return pendingWalkFromDemoRound(
        demoRounds.find((x) => x.id === activeRoundId && x.status === "active"),
      );
    }
    return null;
  }, [
    walkEngaged,
    pendingRemoteRound,
    session,
    activeRoundId,
    demoRounds,
  ]);

  const activeRound = useMemo(() => {
    if (!walkEngaged) return null;
    if (hasConfiguredBackend() && remoteRound) {
      return {
        id: remoteRound.id,
        stopCount: Math.max(remoteRound.stop_count ?? 0, session?.stopCount ?? 0),
        greenhouseName:
          session?.greenhouseName ??
          remoteRound.greenhouses?.name ??
          scan.greenhouseName ??
          "—",
        startedAt: remoteRound.started_at,
      };
    }
    if (session && hasConfiguredBackend()) {
      return {
        id: session.roundId,
        stopCount: Math.max(remoteRound?.stop_count ?? 0, session.stopCount ?? 0),
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
  }, [activeRoundId, demoRounds, remoteRound, scan.greenhouseName, session, walkEngaged]);

  const tracker = useScoutingRouteTracker(
    activeRound?.id ?? null,
    activeRound?.startedAt,
  );
  const canStart = (scan.farmId && scan.greenhouseId) || !!session;
  const sampling = samplingTargetForGreenhouse(
    activeRound?.greenhouseName ?? scan.greenhouseName,
  );
  const sampleProgress = activeRound
    ? Math.min(
        100,
        Math.round(
          (activeRound.stopCount / Math.max(1, sampling.targetStops)) * 100,
        ),
      )
    : 0;
  const samplingMet = activeRound
    ? activeRound.stopCount >= sampling.targetStops
    : false;

  const handleStart = async () => {
    if (!canStart && !scan.greenhouseId) return;

    if (isOfflineDemo()) {
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
        stopCount: 0,
      });
      engageWalk();
      toast({
        title: "Walking started",
        description: "Your path is recording. Greenhouse stays fixed until you finish.",
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

      const offline =
        typeof navigator !== "undefined" && navigator.onLine === false;

      if (offline) {
        const localId = crypto.randomUUID();
        const startedAt = new Date().toISOString();
        enqueueRoundStart({
          id: localId,
          scout_id: user.id,
          farm_id: scan.farmId!,
          greenhouse_id: scan.greenhouseId!,
          started_at: startedAt,
        });
        setSession({
          roundId: localId,
          farmId: scan.farmId!,
          farmName: scan.farmName ?? "Farm",
          greenhouseId: scan.greenhouseId!,
          greenhouseName: scan.greenhouseName ?? "Greenhouse",
          startedAt,
          stopCount: 0,
          pendingOffline: true,
        });
        engageWalk();
        toast({
          title: "Walking started offline",
          description:
            "Saved on this phone. Logs will upload when you reconnect.",
          tone: "default",
        });
        return;
      }

      const existing = await getAnyActiveRoundForScout(user.id);
      if (existing.data) {
        const row = existing.data as ScoutingRoundRow;
        setPendingRemoteRound(row);
        const meta = greenhouseMeta(row.greenhouse_id, row.farm_id);
        setSession({
          roundId: row.id,
          farmId: row.farm_id,
          farmName: row.farms?.name ?? meta.farmName,
          greenhouseId: row.greenhouse_id,
          greenhouseName: row.greenhouses?.name ?? meta.greenhouseName,
          startedAt: row.started_at,
          stopCount: row.stop_count ?? 0,
        });
        toast({
          title: "Unfinished walk",
          description: "Tap Resume walking to continue, or Discard to end it.",
          tone: "default",
        });
        return;
      }

      const { data, error } = await startScoutingRound({
        scout_id: user.id,
        farm_id: scan.farmId!,
        greenhouse_id: scan.greenhouseId!,
      });
      if (error) {
        if (isLikelyOfflineError(error)) {
          const localId = crypto.randomUUID();
          const startedAt = new Date().toISOString();
          enqueueRoundStart({
            id: localId,
            scout_id: user.id,
            farm_id: scan.farmId!,
            greenhouse_id: scan.greenhouseId!,
            started_at: startedAt,
          });
          setSession({
            roundId: localId,
            farmId: scan.farmId!,
            farmName: scan.farmName ?? "Farm",
            greenhouseId: scan.greenhouseId!,
            greenhouseName: scan.greenhouseName ?? "Greenhouse",
            startedAt,
            stopCount: 0,
            pendingOffline: true,
          });
          engageWalk();
          toast({
            title: "Walking started offline",
            description:
              "No signal — saved on this phone. Keep logging; sync when online.",
            tone: "default",
          });
          return;
        }
        throw error;
      }
      bindRemoteRound(data as ScoutingRoundRow);
      engageWalk();
      toast({
        title: "Walking started",
        description: "Greenhouse is fixed for this walk. Finish to change house.",
        tone: "success",
      });
    } catch (e) {
      toast({
        title: "Could not start walking",
        description: e instanceof Error ? e.message : "Unknown error",
        tone: "error",
      });
    }
  };

  const handleComplete = async () => {
    if (!activeRound) return;

    if (!samplingMet) {
      const ok =
        typeof window !== "undefined"
          ? window.confirm(
              `Sampling target not met (${activeRound.stopCount}/${sampling.targetStops} stops). Finish anyway?`,
            )
          : false;
      if (!ok) {
        toast({
          title: "Keep sampling",
          description: `Need ${sampling.targetStops - activeRound.stopCount} more stops (or confirm override).`,
          tone: "error",
        });
        return;
      }
    }

    setFinishing(true);
    try {
      const offline =
        typeof navigator !== "undefined" && navigator.onLine === false;

      const flushResult = await tracker.flush({ all: true });
      const hasPendingGps = flushResult.remaining > 0;

      const bufferPoints = getPointsForRound(activeRound.id);
      const demoPoints = demoRoutePoints.filter((p) => p.roundId === activeRound.id);
      const routePts = hasConfiguredBackend()
        ? bufferPoints
        : [...demoPoints, ...bufferPoints.filter((b) => !demoPoints.some((d) => d.id === b.id))];

      let stops = demoRecords
        .filter((r) => r.roundId === activeRound.id)
        .map((r) => ({
          columnNo: r.columnNo,
          bayNo: r.bayNo,
          latitude: r.latitude,
          longitude: r.longitude,
        }));

      if (hasConfiguredBackend() && !offline && !session?.pendingOffline) {
        const { data: roundRecords, error: recordsError } = await listRecordsForRound(
          activeRound.id,
        );
        if (recordsError) throw recordsError;
        stops = (roundRecords ?? []).map((r) => ({
          columnNo: r.column_no,
          bayNo: r.bay_no,
          latitude: r.latitude,
          longitude: r.longitude,
        }));
      } else if (hasConfiguredBackend()) {
        // Offline / pending: use local session stop count as coverage proxy via demo-shaped stops
        stops = Array.from({ length: activeRound.stopCount }, (_, i) => ({
          columnNo: (i % 5) + 1,
          bayNo: Math.floor(i / 5) + 1,
          latitude: null as number | null,
          longitude: null as number | null,
        }));
      }

      const coverage = buildCoverageModel({
        greenhouseName: activeRound.greenhouseName,
        stops: stops.map((s) => ({
          columnNo: s.columnNo,
          bayNo: s.bayNo,
          latitude: s.latitude,
          longitude: s.longitude,
        })),
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

      if (isOfflineDemo()) {
        completeDemoRound(activeRound.id, {
          distanceM,
          durationS,
          pointCount: routePts.length,
          coveragePct: coverage.coveragePct,
        });
        clearBufferRound(activeRound.id);
        clearSession();
        toast({
          title: "Walking finished",
          description: `${formatDistance(distanceM)} · ${formatDuration(durationS)} · ${coverage.coveragePct}% coverage`,
          tone: "success",
        });
        return;
      }

      if (offline || hasPendingGps || session?.pendingOffline) {
        enqueueRoundFinish({
          round_id: activeRound.id,
          coveragePct: coverage.coveragePct,
        });
        clearSession();
        setRemoteRound(null);
        toast({
          title: "Finish saved offline",
          description: hasPendingGps
            ? `${flushResult.remaining} GPS points will sync when online.`
            : "Will complete on the server when you reconnect.",
          tone: "default",
        });
        return;
      }

      const { error } = await finalizeRoundMetrics(activeRound.id, {
        coveragePct: coverage.coveragePct,
      });
      if (error) {
        if (isLikelyOfflineError(error)) {
          enqueueRoundFinish({
            round_id: activeRound.id,
            coveragePct: coverage.coveragePct,
          });
          clearSession();
          setRemoteRound(null);
          toast({
            title: "Finish saved offline",
            description: "No signal — will sync when you reconnect.",
            tone: "default",
          });
          return;
        }
        throw error;
      }
      clearBufferRound(activeRound.id);
      setRemoteRound(null);
      clearSession();
      toast({
        title: "Walking finished",
        description: `${formatDistance(distanceM)} · ${formatDuration(durationS)} · ${coverage.coveragePct}% coverage`,
        tone: "success",
      });
    } catch (e) {
      toast({
        title: "Could not finish walking",
        description: e instanceof Error ? e.message : "Unknown error",
        tone: "error",
      });
    } finally {
      setFinishing(false);
    }
  };

  const handleResume = () => {
    if (pendingRemoteRound) {
      bindRemoteRound(pendingRemoteRound);
    } else if (session) {
      setContext({
        farmId: session.farmId,
        farmName: session.farmName,
        greenhouseId: session.greenhouseId,
        greenhouseName: session.greenhouseName,
      });
    } else if (isOfflineDemo() && activeRoundId) {
      const demo = demoRounds.find((r) => r.id === activeRoundId && r.status === "active");
      if (demo) {
        setSession({
          roundId: demo.id,
          farmId: demo.farmId,
          farmName: "Farm",
          greenhouseId: demo.greenhouseId,
          greenhouseName: demo.greenhouseName,
          startedAt: demo.startedAt,
          stopCount: demo.stopCount,
        });
        setContext({
          farmId: demo.farmId,
          greenhouseId: demo.greenhouseId,
          greenhouseName: demo.greenhouseName,
        });
      }
    }
    setPendingRemoteRound(null);
    engageWalk();
    toast({
      title: "Walking resumed",
      description: "Log what you see, then finish when done.",
      tone: "success",
    });
  };

  const handleDiscard = async () => {
    if (!pendingWalk) return;
    const ok =
      typeof window !== "undefined"
        ? window.confirm(
            `End the unfinished walk in ${pendingWalk.greenhouseName}? Saved stops stay in history; you can start a new walk after.`,
          )
        : false;
    if (!ok) return;

    setDiscarding(true);
    try {
      if (hasConfiguredBackend()) {
        const { error } = await completeScoutingRound(pendingWalk.roundId);
        if (error) throw error;
      } else {
        completeDemoRound(pendingWalk.roundId, { durationS: 0, distanceM: 0 });
      }
      clearBufferRound(pendingWalk.roundId);
      setPendingRemoteRound(null);
      setRemoteRound(null);
      clearSession();
      toast({
        title: "Walk ended",
        description: "Tap Start walking when you begin a new round.",
        tone: "default",
      });
    } catch (e) {
      toast({
        title: "Could not end walk",
        description: e instanceof Error ? e.message : "Unknown error",
        tone: "error",
      });
    } finally {
      setDiscarding(false);
    }
  };

  const geofenceMessage = tracker.geofenceAnchorMismatch
    ? "Map location doesn’t match your greenhouse. Keep walking — finish when done."
    : tracker.geofenceOutside
      ? "You may be outside this greenhouse. Check you are in the right house."
      : null;

  return (
    <div className="rounded-2xl border border-border bg-card/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-primary" />
          <div>
            <p className="text-sm font-semibold">2. Walking this greenhouse</p>
            <p className="text-xs text-muted-foreground">
              Start walking, log what you see, then finish.
            </p>
          </div>
        </div>
        {activeRound ? (
          <Badge variant="warning">
            Walking · {activeRound.stopCount} logs · {activeRound.greenhouseName}
          </Badge>
        ) : pendingWalk ? (
          <Badge variant="outline">Unfinished · {pendingWalk.greenhouseName}</Badge>
        ) : (
          <Badge variant="outline">Not started</Badge>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {pendingWalk && !activeRound ? (
          <div className="space-y-3 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-3">
            <p className="text-sm text-amber-950 dark:text-amber-100">
              You have an unfinished walk in{" "}
              <span className="font-semibold">{pendingWalk.greenhouseName}</span>
              {pendingWalk.stopCount > 0
                ? ` (${pendingWalk.stopCount} log${pendingWalk.stopCount === 1 ? "" : "s"})`
                : ""}
              . Resume to keep logging, or discard to end this round.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                type="button"
                size="lg"
                className="h-11 w-full"
                disabled={discarding}
                onClick={() => handleResume()}
              >
                <Play className="mr-2 size-4" />
                Resume walking
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="h-11 w-full"
                disabled={discarding}
                onClick={() => void handleDiscard()}
              >
                {discarding ? "Ending…" : "Discard walk"}
              </Button>
            </div>
          </div>
        ) : null}
        {activeRound ? (
          <Button
            type="button"
            id="worker-finish-walking"
            size="lg"
            className="h-12 w-full"
            disabled={finishing}
            onClick={() => void handleComplete()}
          >
            <Square className="mr-2 size-4" />
            {finishing
              ? "Finishing…"
              : samplingMet
                ? "Finish walking"
                : `Finish walking (${activeRound.stopCount}/${sampling.targetStops})`}
          </Button>
        ) : pendingWalk ? null : (
          <Button
            type="button"
            size="lg"
            className="h-12 w-full"
            disabled={!canStart && !scan.greenhouseId}
            onClick={() => void handleStart()}
          >
            <Play className="mr-2 size-4" />
            Start walking
          </Button>
        )}
      </div>

      {activeRound ? (
        <details className="mt-3 rounded-xl border border-border bg-muted/20 px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium">Show details</summary>
          <div className="mt-3 space-y-3">
            <div className="rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 text-xs">
              <p className="font-medium text-foreground">Sampling checklist</p>
              <p className="mt-1 text-muted-foreground">{sampling.walkHint}</p>
              <p className="mt-2 tabular-nums text-foreground">
                Progress: {activeRound.stopCount}/{sampling.targetStops} stops (
                {sampleProgress}%)
                {activeRound.stopCount < sampling.targetStops
                  ? " — Finish will ask to confirm if you leave early."
                  : " — sample target met; finish when ready."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
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

            {tracker.gpsStabilityHint ? (
              <p className="flex items-start gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-950 dark:text-sky-100">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                {tracker.gpsStabilityHint}
              </p>
            ) : null}

            {geofenceMessage ? (
              <p className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                {geofenceMessage}
              </p>
            ) : null}

            {tracker.livePath.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-border">
                <LiveRouteMiniMap path={tracker.livePath} />
              </div>
            ) : null}
          </div>
        </details>
      ) : scan.greenhouseName ? (
        <p className="mt-3 text-xs text-muted-foreground">
          After you start: {sampling.walkHint}
        </p>
      ) : null}
    </div>
  );
}
