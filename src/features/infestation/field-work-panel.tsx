"use client";

import { useState } from "react";

import { FieldWriteQueueSync } from "@/features/field/field-write-queue-sync";
import { HttpsGpsBanner } from "@/features/field/https-gps-banner";
import { HotspotResumePanel } from "@/features/infestation/hotspot-resume-panel";
import { ReportInfestationForm } from "@/features/infestation/report-infestation-form";
import { GreenhouseHeatGrid } from "@/features/scouting/greenhouse-heat-grid";
import { ScoutingRoundBar } from "@/features/scouting/scouting-round-bar";
import { ScoutingStopForm } from "@/features/scouting/scouting-stop-form";
import { WorkerLocationPanel } from "@/features/scouting/worker-location-panel";
import { Button } from "@/components/ui/button";
import { useGreenhouseAnchorsSync } from "@/hooks/use-greenhouse-anchors-sync";
import {
  isClearScoutObservation,
  type ScoutCellLocation,
  type ScoutObservationHandoff,
} from "@/lib/scout-observation-flow";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { useScanStore } from "@/store/scan-store";
import {
  isScoutingWalkEngaged,
  useScoutingSessionStore,
} from "@/store/scouting-session-store";
import { useScoutingStore } from "@/store/scouting-store";

type Mode = "choose" | "pick-cell" | "scout" | "report";

export function FieldWorkPanel() {
  useGreenhouseAnchorsSync();
  const [mode, setMode] = useState<Mode>("choose");
  const [selectedCell, setSelectedCell] = useState<ScoutCellLocation | null>(null);
  const [handoff, setHandoff] = useState<ScoutObservationHandoff | null>(null);
  const scan = useScanStore();
  const session = useScoutingSessionStore((s) => s.session);
  const walkEngaged = useScoutingSessionStore((s) => s.walkEngaged);
  const demoRoundId = useScoutingStore((s) => s.activeRoundId);
  const roundActive = isScoutingWalkEngaged(
    walkEngaged,
    session,
    demoRoundId,
    hasSupabaseEnv(),
  );

  const resetFlow = () => {
    setMode("choose");
    setSelectedCell(null);
    setHandoff(null);
  };

  return (
    <section className="space-y-4">
      <HttpsGpsBanner />
      <FieldWriteQueueSync />
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
          <p className="text-sm font-semibold">3. Log what you see</p>
          <div className="grid grid-cols-1 gap-3">
            <Button
              size="lg"
              className="h-auto min-h-14 flex-col items-stretch gap-1 px-4 py-3 text-left sm:text-base"
              data-testid="add-observation"
              disabled={!roundActive}
              onClick={() => {
                setHandoff(null);
                setSelectedCell(null);
                setMode("pick-cell");
              }}
            >
              <span className="text-sm font-semibold sm:text-base">Walk rows and log</span>
              <span className="text-xs font-normal opacity-80">
                Pick a spot on the map, then save.
              </span>
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="h-auto min-h-14 flex-col items-stretch gap-1 px-4 py-3 text-left sm:text-base"
              onClick={() => {
                setHandoff(null);
                setMode("report");
              }}
            >
              <span className="text-sm font-semibold sm:text-base">Report a problem now</span>
              <span className="text-xs font-normal opacity-80">
                Skip the walk — pest or disease only.
              </span>
            </Button>
          </div>
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
              lockGreenhouse
              interactive
              selectedCell={selectedCell}
              onCellSelect={(cell) => {
                setSelectedCell(cell);
                setMode("scout");
              }}
            />
          ) : (
            <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Confirm your greenhouse so the map can load.
            </p>
          )}
        </div>
      ) : null}

      {mode === "scout" && selectedCell ? (
        <div className="glass-card rounded-2xl p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Crop check</h2>
            <Button variant="ghost" size="sm" onClick={() => setMode("pick-cell")}>
              Back
            </Button>
          </div>
          <ScoutingStopForm
            initialCell={selectedCell}
            lockLocation
            onChangeCell={() => setMode("pick-cell")}
            onSuccess={(next) => {
              if (isClearScoutObservation(next.issueName)) {
                resetFlow();
                return;
              }
              setHandoff(next);
              setMode("report");
            }}
          />
        </div>
      ) : null}

      {mode === "report" ? (
        <div className="glass-card rounded-2xl p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Pest / disease report</h2>
            <Button variant="ghost" size="sm" onClick={resetFlow}>
              Back
            </Button>
          </div>
          {handoff ? (
            <p className="mb-3 text-sm text-muted-foreground">
              Crop check saved. Finish the pest or disease report, or skip.
            </p>
          ) : null}
          <ReportInfestationForm fromObservation={handoff} onSuccess={resetFlow} />
          {handoff ? (
            <Button
              type="button"
              variant="ghost"
              className="mt-3 w-full"
              onClick={resetFlow}
            >
              Skip pest report
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
