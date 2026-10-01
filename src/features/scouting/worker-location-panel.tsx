"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, QrCode } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GreenhousePicker } from "@/features/scouting/greenhouse-picker";
import { LiveGpsTracker } from "@/features/scouting/live-gps-tracker";
import {
  BEMACK_DEMO_LOCATIONS,
  formatStarGreenhouseLabel,
} from "@/lib/bemack-master-data";
import { useToast } from "@/hooks/use-toast";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { useGreenhouseAnchorStore } from "@/store/greenhouse-anchor-store";
import { useScanStore } from "@/store/scan-store";
import {
  isScoutingWalkEngaged,
  useScoutingSessionStore,
} from "@/store/scouting-session-store";
import { useScoutingStore } from "@/store/scouting-store";

/**
 * Single “Where are you?” card for workers: status, QR scan, pick greenhouse, GPS in background.
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
  const { toast } = useToast();
  const [manualGh, setManualGh] = useState(scan.greenhouseName ?? "");

  const walkLocked = isScoutingWalkEngaged(
    walkEngaged,
    scoutingSession,
    demoRoundId,
    hasSupabaseEnv(),
  );

  useEffect(() => {
    if (scan.greenhouseName) setManualGh(scan.greenhouseName);
  }, [scan.greenhouseName]);

  const ready = Boolean(scan.farmId && scan.greenhouseId);

  const greenhouseOptions =
    anchors.length > 0
      ? anchors.map((l) => ({ id: l.greenhouseId, name: l.greenhouseName }))
      : BEMACK_DEMO_LOCATIONS.map((l) => ({
          id: l.greenhouseId,
          name: l.greenhouseName,
        }));

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

    const fromDemo = BEMACK_DEMO_LOCATIONS.find((l) => l.greenhouseName === greenhouseName);
    const fromAnchor = anchors.find((l) => l.greenhouseName === greenhouseName);
    const loc = fromDemo ?? fromAnchor;
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
          Finding your greenhouse… Scan QR or pick one below.
        </p>
      )}

      <Link
        href="/worker/scan"
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground hover:opacity-95"
      >
        <QrCode className="size-4" />
        Scan entrance QR
      </Link>

      <div className="relative z-30 space-y-1.5 text-sm">
        <span className="font-medium">Or pick greenhouse</span>
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
