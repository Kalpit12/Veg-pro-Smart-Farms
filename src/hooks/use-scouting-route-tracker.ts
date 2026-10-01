"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { watchScoutingPosition, type GpsPositionSample } from "@/lib/gps";
import { distanceBetweenPoints, durationSeconds, formatDistance, formatDuration } from "@/lib/route-metrics";
import { checkGreenhouseGeofence } from "@/lib/scouting-geofence";
import { hasConfiguredBackend, isOfflineDemo } from "@/lib/data-backend";
import { appendRoutePoints } from "@/services/supabase/scouting-route-service";
import { upsertWorkerPosition } from "@/services/supabase/position-service";
import { getCurrentUser } from "@/services/supabase/auth-service";
import { useGreenhouseAnchorStore } from "@/store/greenhouse-anchor-store";
import { useScoutingRouteBufferStore } from "@/store/scouting-route-buffer-store";
import { useScoutingStore } from "@/store/scouting-store";
import { useScanStore } from "@/store/scan-store";
import { useScoutingSessionStore } from "@/store/scouting-session-store";

const FLUSH_BATCH = 12;
const FLUSH_MS = 12_000;

function rejectHint(
  reason: string | null,
  accuracyM: number | null | undefined,
): string | null {
  if (!reason) return null;
  if (reason === "gps_noise") {
    return "Holding position — browser GPS is jittering while you are stationary (common indoors / on desktop).";
  }
  if (reason === "poor_accuracy") {
    return `GPS accuracy too low${accuracyM != null ? ` (~${Math.round(accuracyM)} m)` : ""}. Walk outdoors for a cleaner track.`;
  }
  if (reason === "too_soon") return null;
  if (reason === "impossible_speed") {
    return "Ignored a GPS jump that looked like signal noise, not walking.";
  }
  return null;
}

export function useScoutingRouteTracker(
  activeRoundId: string | null,
  startedAt?: string | null,
) {
  const greenhouseId = useScanStore((s) => s.greenhouseId);
  const sessionGreenhouseId = useScoutingSessionStore((s) => s.session?.greenhouseId);
  const lockedGreenhouseId = sessionGreenhouseId ?? greenhouseId;
  const addBufferPoint = useScoutingRouteBufferStore((s) => s.addPoint);
  const getUnsynced = useScoutingRouteBufferStore((s) => s.getUnsynced);
  const markSynced = useScoutingRouteBufferStore((s) => s.markSynced);
  const getPointsForRound = useScoutingRouteBufferStore((s) => s.getPointsForRound);
  const lastRejectReason = useScoutingRouteBufferStore((s) => s.lastRejectReason);
  const addDemoRoutePoint = useScoutingStore((s) => s.addDemoRoutePoint);

  const [liveDistanceM, setLiveDistanceM] = useState(0);
  const [liveElapsedS, setLiveElapsedS] = useState(0);
  const [geofenceOutside, setGeofenceOutside] = useState(false);
  const [geofenceAnchorMismatch, setGeofenceAnchorMismatch] = useState(false);
  const [lastSample, setLastSample] = useState<GpsPositionSample | null>(null);
  const [gpsStabilityHint, setGpsStabilityHint] = useState<string | null>(null);
  const startedAtRef = useRef<string | null>(null);
  const flushingRef = useRef(false);
  const lastPublishRef = useRef(0);

  const flush = useCallback(
    async (options?: { all?: boolean }) => {
      if (!activeRoundId) return { remaining: 0 };
      const maxLoops = options?.all ? 200 : 1;

      for (let i = 0; i < 40 && flushingRef.current; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (isOfflineDemo()) {
        const unsynced = getUnsynced(activeRoundId);
        if (unsynced.length) markSynced(unsynced.map((p) => p.id));
        return { remaining: 0 };
      }

      flushingRef.current = true;
      try {
        for (let i = 0; i < maxLoops; i++) {
          const unsynced = getUnsynced(activeRoundId);
          if (!unsynced.length) return { remaining: 0 };
          const batch = unsynced.slice(0, FLUSH_BATCH);
          const { error } = await appendRoutePoints(
            activeRoundId,
            batch.map((p) => ({
              latitude: p.latitude,
              longitude: p.longitude,
              accuracy_m: p.accuracyM,
              recorded_at: p.recordedAt,
            })),
          );
          if (error) throw error;
          markSynced(batch.map((p) => p.id));
          if (!options?.all) break;
        }
        return { remaining: getUnsynced(activeRoundId).length };
      } finally {
        flushingRef.current = false;
      }
    },
    [activeRoundId, getUnsynced, markSynced],
  );

  const onSample = useCallback(
    (sample: GpsPositionSample) => {
      if (!activeRoundId) return;
      setLastSample(sample);

      const fence = checkGreenhouseGeofence(
        sample,
        lockedGreenhouseId,
        useGreenhouseAnchorStore.getState().anchors,
      );
      setGeofenceOutside(fence ? !fence.inside && !fence.anchorMismatch : false);
      setGeofenceAnchorMismatch(fence?.anchorMismatch ?? false);

      const added = addBufferPoint({
        roundId: activeRoundId,
        latitude: sample.latitude,
        longitude: sample.longitude,
        accuracyM: sample.accuracyM,
        recordedAt: sample.recordedAt,
      });

      const reason = useScoutingRouteBufferStore.getState().lastRejectReason;
      setGpsStabilityHint(rejectHint(reason, sample.accuracyM));

      if (added && isOfflineDemo()) {
        addDemoRoutePoint({
          roundId: activeRoundId,
          latitude: sample.latitude,
          longitude: sample.longitude,
          accuracyM: sample.accuracyM,
          recordedAt: sample.recordedAt,
        });
      }

      const points = getPointsForRound(activeRoundId);
      setLiveDistanceM(
        distanceBetweenPoints(
          points.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
        ),
      );

      // Throttle live map position upserts — don't spam on every noisy fix
      const now = Date.now();
      if (hasConfiguredBackend() && (added || now - lastPublishRef.current > 20_000)) {
        lastPublishRef.current = now;
        void getCurrentUser().then((user) => {
          if (user) {
            void upsertWorkerPosition(user.id, sample.latitude, sample.longitude);
          }
        });
      }
    },
    [
      activeRoundId,
      lockedGreenhouseId,
      addBufferPoint,
      addDemoRoutePoint,
      getPointsForRound,
    ],
  );

  useEffect(() => {
    if (!activeRoundId) {
      setLiveDistanceM(0);
      setLiveElapsedS(0);
      setGeofenceOutside(false);
      setGeofenceAnchorMismatch(false);
      setLastSample(null);
      setGpsStabilityHint(null);
      startedAtRef.current = null;
      return;
    }

    startedAtRef.current = startedAt ?? new Date().toISOString();
    const points = getPointsForRound(activeRoundId);
    if (!startedAt && points[0]) startedAtRef.current = points[0].recordedAt;

    const stopWatch = watchScoutingPosition(onSample, { pollMs: 5000 });
    const tick = window.setInterval(() => {
      if (startedAtRef.current) {
        setLiveElapsedS(durationSeconds(startedAtRef.current));
      }
    }, 1000);
    const flushTimer = window.setInterval(() => {
      void flush().catch(() => undefined);
    }, FLUSH_MS);

    void flush().catch(() => undefined);

    return () => {
      stopWatch();
      window.clearInterval(tick);
      window.clearInterval(flushTimer);
      void flush().catch(() => undefined);
    };
  }, [activeRoundId, startedAt, onSample, flush, getPointsForRound]);

  const livePath = activeRoundId
    ? getPointsForRound(activeRoundId).map((p) => ({
        lat: p.latitude,
        lng: p.longitude,
        recordedAt: p.recordedAt,
      }))
    : [];

  return {
    liveDistanceM,
    liveElapsedS,
    livePath,
    lastSample,
    geofenceOutside,
    geofenceAnchorMismatch,
    gpsStabilityHint,
    lastRejectReason,
    formatLiveDistance: formatDistance(liveDistanceM),
    formatLiveDuration: formatDuration(liveElapsedS),
    flush,
  };
}
