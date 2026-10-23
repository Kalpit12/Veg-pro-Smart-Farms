"use client";

import { useState } from "react";

import { HttpsGpsBanner } from "@/features/field/https-gps-banner";
import { HotspotResumePanel } from "@/features/infestation/hotspot-resume-panel";
import { ReportInfestationForm } from "@/features/infestation/report-infestation-form";
import { GreenhouseHeatGrid } from "@/features/scouting/greenhouse-heat-grid";
import { ScoutingRoundBar } from "@/features/scouting/scouting-round-bar";
import { WorkerLocationPanel } from "@/features/scouting/worker-location-panel";
import { Button } from "@/components/ui/button";
import { useGreenhouseAnchorsSync } from "@/hooks/use-greenhouse-anchors-sync";
import type { ScoutCellLocation } from "@/lib/scout-observation-flow";
import { hasConfiguredBackend, isOfflineDemo } from "@/lib/data-backend";
import { useScanStore } from "@/store/scan-store";
import {
  isScoutingWalkEngaged,
  useScoutingSessionStore,
} from "@/store/scouting-session-store";
import { useScoutingStore } from "@/store/scouting-store";

type Mode = "choose" | "pick-cell" | "report";

export function FieldWorkPanel() {
  useGreenhouseAnchorsSync();
  const [mode, setMode] = useState<Mode>("choose");
  const [selectedCell, setSelectedCell] = useState<ScoutCellLocation | null>(null);
  const scan = useScanStore();
  const session = useScoutingSessionStore((s) => s.session);
  const walkEngaged = useScoutingSessionStore((s) => s.walkEngaged);
  const demoRoundId = useScoutingStore((s) => s.activeRoundId);
  const roundActive = isScoutingWalkEngaged(
    walkEngaged,
    session,
    demoRoundId,
    hasConfiguredBackend(),
  );

  const resetFlow = () => {
    setMode("choose");
    setSelectedCell(null);
  };

  return (
    <section className="space-y-4">
      <HttpsGpsBanner />
      <WorkerLocationPanel />

      {scan.farmId ? <ScoutingRoundBar /> : null}

      {scan.farmId ? <HotspotResumePanel /> : null}

      {!scan.farmId ? (
        <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Confirm your greenhouse above to continue.
        </p>
      ) : null}

      {scan.farmId && !roundActive ? (
        <p className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-950 dark:text-amber-100">
          Tap <span className="font-medium">Start walking</span> before logging row checks.
        </p>
      ) : null}

      {mode === "choose" && scan.farmId ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold">3. Walk rows and report</p>
          <Button
            size="lg"
            className="h-auto min-h-14 w-full flex-col items-stretch gap-1 px-4 py-3 text-left sm:text-base"
            data-testid="add-observation"
            disabled={!roundActive}
            onClick={() => {
              setSelectedCell(null);
              setMode("pick-cell");
            }}
          >
            <span className="text-sm font-semibold sm:text-base">Walk rows and report</span>
            <span className="text-xs font-normal opacity-80">
              Pick bay × column on the heat map, then report on the flower.
            </span>
          </Button>
        </div>
      ) : null}

      {mode === "pick-cell" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Pick a spot</h2>
            <Button variant="ghost" size="sm" onClick={resetFlow}>
              Back
            </Button>
          </div>
          {scan.greenhouseName ? (
            <GreenhouseHeatGrid
              greenhouseName={scan.greenhouseName}
              greenhouseId={scan.greenhouseId}
              lockGreenhouse
              interactive
              selectedCell={selectedCell}
              onCellSelect={(cell) => {
                setSelectedCell(cell);
                setMode("report");
              }}
            />
          ) : (
            <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Confirm your greenhouse so the map can load.
            </p>
          )}
        </div>
      ) : null}

      {mode === "report" ? (
        <div className="glass-card rounded-2xl p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Log on the flower</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode("pick-cell")}
            >
              Back
            </Button>
          </div>
          <ReportInfestationForm
            initialCell={selectedCell}
            onSuccess={resetFlow}
            onWalkFinished={resetFlow}
          />
        </div>
      ) : null}
    </section>
  );
}
