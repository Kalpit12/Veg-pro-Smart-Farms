"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GreenhousePicker } from "@/features/scouting/greenhouse-picker";
import { LiveGpsTracker } from "@/features/scouting/live-gps-tracker";
import {
  BEMACK_DEMO_LOCATIONS,
  formatStarGreenhouseLabel,
} from "@/lib/bemack-master-data";
import { useToast } from "@/hooks/use-toast";
import { hasConfiguredBackend, isOfflineDemo } from "@/lib/data-backend";
import { useGreenhouseAnchorStore } from "@/store/greenhouse-anchor-store";
import { useScanStore } from "@/store/scan-store";
import {
  isScoutingWalkEngaged,
  useScoutingSessionStore,
} from "@/store/scouting-session-store";
import { useScoutingStore } from "@/store/scouting-store";

/**
 * Single “Where are you?” card for workers: status, pick greenhouse, GPS in background.
 */
export function WorkerLocationPanel() {
  const scan = useScanStore();
  const setContext = useScanStore((s) => s.setContext);
  const lockAssignment = useScanStore((s) => s.lockAssignment);
  const unlockAssignment = useScanStore((s) => s.unlockAssignment);
  const scoutingSession = useScoutingSessionStore((s) => s.session);
  const walkEngaged = useScoutingSessionStore((s) => s.walkEngaged);
  const demoRoundId = useScoutingStore((s) => s.activeRoundId);
  const anchors = useGreenhouseAnchorStore((s) => s.anchors);
  const fieldSites = useGreenhouseAnchorStore((s) => s.fieldSites);
  const { toast } = useToast();
  const [manualGh, setManualGh] = useState(scan.greenhouseName ?? "");

  const walkLocked = isScoutingWalkEngaged(
    walkEngaged,
    scoutingSession,
    demoRoundId,
    hasConfiguredBackend(),
  );

  useEffect(() => {
    if (scan.greenhouseName) setManualGh(scan.greenhouseName);
  }, [scan.greenhouseName]);

  const ready = Boolean(scan.farmId && scan.greenhouseId);

  const offlineDemo = isOfflineDemo();
  // Live site: only greenhouses that came from the database (never the built-in Star sheet).
  const liveAnchors = offlineDemo ? anchors : anchors.filter((a) => a.fromDb);

  const greenhouseOptions =
    fieldSites.length > 0
      ? fieldSites.map((l) => ({
          id: l.greenhouseId,
          name: l.greenhouseName,
          variety: l.cropType ?? null,
          farmName: l.farmName,
        }))
      : liveAnchors.length > 0
        ? liveAnchors.map((l) => ({ id: l.greenhouseId, name: l.greenhouseName }))
        : offlineDemo
          ? BEMACK_DEMO_LOCATIONS.map((l) => ({
              id: l.greenhouseId,
              name: l.greenhouseName,
            }))
          : [];

  // Saved house no longer allowed (re-assigned, e.g. Star -> Galaxy, or removed from DB).
  const optionIdsKey = greenhouseOptions.map((o) => o.id).join(",");
  useEffect(() => {
    if (walkLocked || offlineDemo || !scan.greenhouseId) return;
    const ids = optionIdsKey ? optionIdsKey.split(",") : [];
    if (!ids.length && !fieldSites.length) return; // still loading
    if (!ids.includes(scan.greenhouseId)) {
      useScanStore.getState().clear();
      setManualGh("");
    }
  }, [optionIdsKey, fieldSites.length, scan.greenhouseId, walkLocked, offlineDemo]);

  const applyGreenhouse = (greenhouseName: string, { silent = false } = {}) => {
    if (walkLocked) {
      toast({
        title: "Finish walking first",
        description: "Tap Finish walking below, then you can change greenhouse.",
        tone: "default",
      });
      setManualGh(scan.greenhouseName ?? "");
      return false;
    }

    if (!greenhouseName) {
      unlockAssignment();
      setManualGh("");
      return true;
    }

    const fromSite = fieldSites.find((l) => l.greenhouseName === greenhouseName);
    const fromAnchor = liveAnchors.find((l) => l.greenhouseName === greenhouseName);
    const fromDemo =
      fieldSites.length || !offlineDemo
        ? undefined
        : BEMACK_DEMO_LOCATIONS.find((l) => l.greenhouseName === greenhouseName);
    const loc = fromSite ?? fromAnchor ?? fromDemo;
    if (!loc) {
      toast({
        title: "Greenhouse not found",
        description: "Pick another house from the list.",
        tone: "error",
      });
      return false;
    }

    setManualGh(loc.greenhouseName);
    setContext({
      farmId: loc.farmId,
      greenhouseId: loc.greenhouseId,
      farmName: loc.farmName,
      greenhouseName: loc.greenhouseName,
      qrValue: fromDemo?.qrValue ?? scan.qrValue,
      assignmentLocked: true,
    });
    lockAssignment();
    if (!silent) {
      toast({
        title: "Greenhouse set",
        description: `You are in ${formatStarGreenhouseLabel(loc.greenhouseName)}`,
        tone: "success",
      });
    }
    return true;
  };

  const statusBadge = walkLocked ? (
    <Badge variant="warning" className="shrink-0">
      Walking
    </Badge>
  ) : ready ? (
    <Badge variant="success" className="shrink-0">
      Ready
    </Badge>
  ) : (
    <Badge variant="outline" className="shrink-0">
      Need greenhouse
    </Badge>
  );

  return (
    <div className="min-w-0 space-y-3 overflow-visible rounded-2xl border border-border bg-card/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">1. Where are you?</p>
            <p className="text-xs text-muted-foreground">
              Confirm your greenhouse, then start walking.
            </p>
          </div>
        </div>
        {statusBadge}
      </div>

      {ready ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-3">
          <p className="text-sm font-semibold">
            You are in {scan.farmName} / {scan.greenhouseName}
          </p>
          {walkLocked ? (
            <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
              Greenhouse is locked while you walk. Tap{" "}
              <span className="font-medium">Finish walking</span> below to change house.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
          Pick your greenhouse below to start field work.
        </p>
      )}

      <div className="relative z-30 space-y-1.5 text-sm">
        <span className="font-medium">Pick greenhouse</span>
        {!offlineDemo && greenhouseOptions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
            No greenhouses loaded for your account yet. Check your connection, or ask the admin
            to set your Monitored sites.
          </p>
        ) : null}
        <GreenhousePicker
          data-testid="check-in-greenhouse"
          value={manualGh}
          options={greenhouseOptions}
          onChange={(next) => {
            setManualGh(next);
            if (next) applyGreenhouse(next);
          }}
        />
        <Button
          type="button"
          size="lg"
          className="h-11 w-full"
          disabled={!manualGh && !walkLocked}
          onClick={() => {
            if (walkLocked) {
              document
                .getElementById("worker-finish-walking")
                ?.scrollIntoView({ behavior: "smooth", block: "center" });
              toast({
                title: "Finish walking first",
                description: "Use the Finish walking button below, then change greenhouse.",
                tone: "default",
              });
              return;
            }
            applyGreenhouse(manualGh);
          }}
        >
          {walkLocked ? "Finish walking to change house" : "Use this greenhouse"}
        </Button>
      </div>

      <LiveGpsTracker variant="worker" />
    </div>
  );
}
