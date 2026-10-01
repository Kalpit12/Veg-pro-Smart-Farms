"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPin, Navigation, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { BEMACK_GREENHOUSES, formatStarGreenhouseLabel } from "@/lib/bemack-master-data";
import {
  captureGps,
  formatGps,
  GeolocationCaptureError,
  geolocationErrorMessage,
  queryGeolocationPermission,
  rememberGpsSample,
  type GpsCoords,
} from "@/lib/gps";
import { defaultFarmContext, distanceToLocation, findNearestGreenhouse } from "@/lib/gps-location";
import { createClient } from "@/lib/supabase/client";
import { hasConfiguredBackend, isOfflineDemo } from "@/lib/data-backend";
import { getCurrentUser } from "@/services/supabase/auth-service";
import { upsertWorkerPosition } from "@/services/supabase/position-service";
import { useGreenhouseAnchorStore } from "@/store/greenhouse-anchor-store";
import { useResumeHotspotStore } from "@/store/resume-hotspot-store";
import { useHotspotTrailStore } from "@/store/hotspot-trail-store";
import { useScanStore } from "@/store/scan-store";
import {
  isScoutingWalkEngaged,
  useScoutingSessionStore,
} from "@/store/scouting-session-store";
import { useScoutingStore } from "@/store/scouting-store";

const POLL_MS = 15000;

type LiveGpsTrackerProps = {
  /** Worker field UI: hide coords, dual badges, and override (parent owns greenhouse pick). */
  variant?: "full" | "worker";
};

export function LiveGpsTracker({ variant = "full" }: LiveGpsTrackerProps) {
  const compact = variant === "worker";
  const [coords, setCoords] = useState<GpsCoords | null>(null);
  const [distanceM, setDistanceM] = useState<number | null>(null);
  const [tracking, setTracking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [manualGh, setManualGh] = useState<string>("");
  const [permissionState, setPermissionState] = useState<PermissionState | "unknown">(
    "unknown",
  );
  const [gpsHint, setGpsHint] = useState<string | null>(null);
  const setContext = useScanStore((s) => s.setContext);
  const lockAssignment = useScanStore((s) => s.lockAssignment);
  const unlockAssignment = useScanStore((s) => s.unlockAssignment);
  const assignmentLocked = useScanStore((s) => s.assignmentLocked);
  const resumeHotspot = useResumeHotspotStore((s) => s.hotspot);
  const addBreadcrumb = useHotspotTrailStore((s) => s.addBreadcrumb);
  const scoutingSession = useScoutingSessionStore((s) => s.session);
  const walkEngaged = useScoutingSessionStore((s) => s.walkEngaged);
  const demoRoundId = useScoutingStore((s) => s.activeRoundId);
  const anchors = useGreenhouseAnchorStore((s) => s.anchors);
  const ctx = useScanStore();
  const { toast } = useToast();

  useEffect(() => {
    void queryGeolocationPermission().then(setPermissionState);
  }, [tracking, refreshing]);

  // Keep scan context pinned while the worker is actively walking
  useEffect(() => {
    if (!isScoutingWalkEngaged(walkEngaged, scoutingSession, demoRoundId, hasConfiguredBackend())) {
      return;
    }
    setContext({
      farmId: scoutingSession!.farmId,
      farmName: scoutingSession!.farmName,
      greenhouseId: scoutingSession!.greenhouseId,
      greenhouseName: scoutingSession!.greenhouseName,
    });
  }, [scoutingSession, walkEngaged, demoRoundId, setContext]);

  const publishWorkerPosition = useCallback(async (position: GpsCoords) => {
    if (!hasConfiguredBackend()) return;
    const user = await getCurrentUser();
    if (!user) return;
    const supabase = createClient();
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role === "worker") {
      await upsertWorkerPosition(user.id, position.latitude, position.longitude);
    }
  }, []);

  const applyLocation = useCallback(
    (position: GpsCoords, greenhouseName?: string) => {
      rememberGpsSample(position);
      const locked = useScanStore.getState().assignmentLocked;
      const scoutingLocked = isScoutingWalkEngaged(
        walkEngaged,
        scoutingSession,
        demoRoundId,
        hasConfiguredBackend(),
      );
      const locations = useGreenhouseAnchorStore.getState().anchors;

      if (resumeHotspot) {
        setCoords(position);
        const loc = locations.find(
          (l) => l.greenhouseId === resumeHotspot.greenhouse_id,
        );
        if (loc) {
          setDistanceM(distanceToLocation(position, loc));
        }
        void publishWorkerPosition(position);
        return;
      }

      if (scoutingLocked) {
        setCoords(position);
        const loc = locations.find(
          (l) => l.greenhouseId === scoutingSession!.greenhouseId,
        );
        if (loc) {
          setDistanceM(distanceToLocation(position, loc));
        }
        void publishWorkerPosition(position);
        return;
      }

      if (locked && !greenhouseName) {
        setCoords(position);
        const currentId = useScanStore.getState().greenhouseId;
        const loc = locations.find((l) => l.greenhouseId === currentId);
        if (loc) {
          setDistanceM(distanceToLocation(position, loc));
        }
        void publishWorkerPosition(position);
        return;
      }

      const currentId = useScanStore.getState().greenhouseId;
      const nearestGps = findNearestGreenhouse(position, locations, {
        preferGreenhouseId: greenhouseName
          ? locations.find((l) => l.greenhouseName === greenhouseName)?.greenhouseId
          : currentId,
      });
      const loc = greenhouseName
        ? locations.find((l) => l.greenhouseName === greenhouseName)!
        : nearestGps;

      setCoords(position);
      setDistanceM(
        greenhouseName ? distanceToLocation(position, loc) : nearestGps.distanceM,
      );
      setContext({
        farmId: loc.farmId,
        greenhouseId: loc.greenhouseId,
        farmName: loc.farmName,
        greenhouseName: loc.greenhouseName,
      });
      void publishWorkerPosition(position);
    },
    [setContext, resumeHotspot, publishWorkerPosition, scoutingSession, walkEngaged, demoRoundId],
  );

  const assignGreenhouseAnchor = useCallback(
    (greenhouseName: string, reason: string) => {
      const loc = useGreenhouseAnchorStore
        .getState()
        .anchors.find((l) => l.greenhouseName === greenhouseName);
      if (!loc) return false;
      applyLocation({ latitude: loc.lat, longitude: loc.lng }, greenhouseName);
      setTracking(true);
      setGpsHint(reason);
      return true;
    },
    [applyLocation],
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setGpsHint(null);
    try {
      const locations = useGreenhouseAnchorStore.getState().anchors;
      const manualLoc = manualGh
        ? locations.find((l) => l.greenhouseName === manualGh)
        : null;
      const anchorFallback = manualLoc
        ? { latitude: manualLoc.lat, longitude: manualLoc.lng }
        : undefined;

      const position = await captureGps({
        allowDemoFallback: isOfflineDemo(),
        anchorFallback,
      });
      applyLocation(position, manualGh || undefined);
      setPermissionState(await queryGeolocationPermission());

      if (resumeHotspot) {
        addBreadcrumb(resumeHotspot.id, position.latitude, position.longitude);
      }

      setTracking(true);
    } catch (e) {
      const perm = await queryGeolocationPermission();
      setPermissionState(perm);

      if (manualGh && assignGreenhouseAnchor(manualGh, "Using selected greenhouse (GPS unavailable)")) {
        return;
      }

      const code =
        e instanceof GeolocationCaptureError
          ? e.code
          : e instanceof GeolocationPositionError
            ? (e.code === e.PERMISSION_DENIED
                ? "PERMISSION_DENIED"
                : e.code === e.TIMEOUT
                  ? "TIMEOUT"
                  : "POSITION_UNAVAILABLE")
            : "POSITION_UNAVAILABLE";

      const message =
        e instanceof Error ? e.message : geolocationErrorMessage(code);

      if (perm === "granted" && code !== "PERMISSION_DENIED") {
        const fallbackGh = manualGh || defaultFarmContext().greenhouseName;
        if (
          assignGreenhouseAnchor(
            fallbackGh,
            "Browser allows location, but this PC could not get coordinates. Using greenhouse anchor — enable Windows Location Services for live GPS.",
          )
        ) {
          toast({
            title: "Using greenhouse assignment",
            description: message,
            tone: "default",
          });
          return;
        }
      }

      toast({
        title: "GPS unavailable",
        description: compact
          ? `${message} Pick a greenhouse above.`
          : `${message} Pick a greenhouse in Override below.`,
        tone: "error",
      });
    } finally {
      setRefreshing(false);
    }
  }, [applyLocation, assignGreenhouseAnchor, manualGh, resumeHotspot, addBreadcrumb, toast, compact]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  if (compact) {
    const locationOff = permissionState === "denied";
    return (
      <div className="space-y-2">
        {locationOff ? (
          <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
            Phone location is off. Turn it on, or pick a greenhouse above.
          </p>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          disabled={refreshing}
          onClick={() => void refresh()}
        >
          <RefreshCw className={`mr-2 size-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Updating…" : "Refresh location"}
        </Button>
      </div>
    );
  }

  return (
    <div className="glass-card min-w-0 space-y-3 overflow-hidden rounded-2xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <Navigation className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Live GPS tracking</h2>
            <p className="text-xs text-muted-foreground">
              Position updates every {POLL_MS / 1000}s for live assignment. After you start
              scouting, GPS track points are recorded from the live watch.
            </p>
          </div>
        </div>
        {tracking ? (
          <Badge variant="success" className="shrink-0">
            Tracking active
          </Badge>
        ) : permissionState === "granted" ? (
          <Badge variant="warning" className="shrink-0">
            Locating…
          </Badge>
        ) : permissionState === "denied" ? (
          <Badge variant="danger" className="shrink-0">
            Location blocked
          </Badge>
        ) : (
          <Badge variant="outline" className="shrink-0">
            Waiting for GPS
          </Badge>
        )}
      </div>

      {permissionState === "granted" && !tracking ? (
        <p className="text-xs text-amber-800 dark:text-amber-200">
          Browser location is allowed. If GPS stays off, step outdoors, or pick a greenhouse
          below.
        </p>
      ) : null}

      {gpsHint ? (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
          {gpsHint}
        </p>
      ) : null}

      {coords ? (
        <p className="break-all rounded-xl bg-muted/40 px-3 py-2 font-mono text-xs">
          {formatGps(coords)}
          {distanceM != null ? (
            <span className="mt-1 block text-muted-foreground sm:mt-0 sm:ml-2 sm:inline">
              · ~{distanceM}m from greenhouse anchor
            </span>
          ) : null}
        </p>
      ) : null}

      {ctx.farmName ? (
        <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold">Current assignment</p>
            <p className="text-sm text-muted-foreground">
              {ctx.farmName} / {ctx.greenhouseName}
              {assignmentLocked ? " · locked (GPS will not switch houses)" : ""}
            </p>
          </div>
        </div>
      ) : null}

      <label className="block space-y-1 text-sm">
        <span className="font-medium">Override greenhouse (optional)</span>
        <select
          className="w-full min-w-0 max-w-full rounded-xl border border-border bg-background px-3 py-2.5"
          value={manualGh}
          disabled={!!scoutingSession}
          onChange={(e) => {
            const name = e.target.value;
            setManualGh(name);
            if (name) {
              const loc = anchors.find((l) => l.greenhouseName === name);
              if (loc) {
                applyLocation({ latitude: loc.lat, longitude: loc.lng }, name);
                lockAssignment();
                setTracking(true);
              }
            } else {
              unlockAssignment();
            }
          }}
        >
          <option value="">Auto from GPS</option>
            {BEMACK_GREENHOUSES.map((gh) => (
            <option key={gh} value={gh}>
              {formatStarGreenhouseLabel(gh)}
            </option>
          ))}
        </select>
        {scoutingSession ? (
          <span className="text-xs text-muted-foreground">
            Greenhouse locked while scouting {scoutingSession.greenhouseName}. Finish the
            round to change house.
          </span>
        ) : null}
      </label>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={refreshing}
        onClick={() => void refresh()}
      >
        <RefreshCw className={`mr-2 size-4 ${refreshing ? "animate-spin" : ""}`} />
        {refreshing ? "Updating location…" : "Refresh GPS now"}
      </Button>
    </div>
  );
}
