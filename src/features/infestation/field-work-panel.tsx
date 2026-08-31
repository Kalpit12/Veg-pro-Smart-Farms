"use client";

import { useState } from "react";

import { FieldWriteQueueSync } from "@/features/field/field-write-queue-sync";
import { HttpsGpsBanner } from "@/features/field/https-gps-banner";
import { HotspotResumePanel } from "@/features/infestation/hotspot-resume-panel";
import { ReportInfestationForm } from "@/features/infestation/report-infestation-form";
import { GreenhouseCheckInPanel } from "@/features/scouting/greenhouse-check-in-panel";
import { GreenhouseHeatGrid } from "@/features/scouting/greenhouse-heat-grid";
import { LiveGpsTracker } from "@/features/scouting/live-gps-tracker";
import { ScoutingRoundBar } from "@/features/scouting/scouting-round-bar";
import { ScoutingStopForm } from "@/features/scouting/scouting-stop-form";
import { Button } from "@/components/ui/button";
import type { ScoutCellLocation, ScoutObservationHandoff } from "@/lib/scout-observation-flow";
import { useScanStore } from "@/store/scan-store";

type Mode = "choose" | "pick-cell" | "scout" | "report";

export function FieldWorkPanel() {
  const [mode, setMode] = useState<Mode>("choose");
  const [selectedCell, setSelectedCell] = useState<ScoutCellLocation | null>(null);
  const [handoff, setHandoff] = useState<ScoutObservationHandoff | null>(null);
  const scan = useScanStore();

  const resetFlow = () => {
    setMode("choose");
    setSelectedCell(null);
    setHandoff(null);
  };

  return (
    <section className="space-y-4">
      <HttpsGpsBanner />
      <FieldWriteQueueSync />
      <GreenhouseCheckInPanel />
      <LiveGpsTracker />

      {scan.farmId ? <ScoutingRoundBar /> : null}

      {scan.farmId ? <HotspotResumePanel /> : null}

      {!scan.farmId ? (
        <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Waiting for GPS or greenhouse check-in…
        </p>
      ) : null}

      {mode === "choose" && scan.farmId ? (
        <div className="grid grid-cols-2 gap-3">
          <Button
            size="lg"
            className="h-14 px-2 text-sm sm:h-16 sm:px-4 sm:text-base"
            data-testid="add-observation"
            onClick={() => {
              setHandoff(null);
              setSelectedCell(null);
              setMode("pick-cell");
            }}
          >
            Add observation
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="col-span-2 h-14 px-2 text-sm sm:h-16 sm:px-4 sm:text-base"
            onClick={() => {
              setHandoff(null);
              setMode("report");
            }}
          >
            Quick infestation report
          </Button>
        </div>
      ) : null}

      {mode === "pick-cell" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Scouting observation</h2>
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
              Check in or wait for GPS so the heat map can load for your greenhouse.
            </p>
          )}
        </div>
      ) : null}

      {mode === "scout" && selectedCell ? (
        <div className="glass-card rounded-2xl p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Scouting observation</h2>
            <Button variant="ghost" size="sm" onClick={() => setMode("pick-cell")}>
              Back
            </Button>
          </div>
          <ScoutingStopForm
            initialCell={selectedCell}
            lockLocation
            onChangeCell={() => setMode("pick-cell")}
            onSuccess={(next) => {
              setHandoff(next);
              setMode("report");
            }}
          />
        </div>
      ) : null}

      {mode === "report" ? (
        <div className="glass-card rounded-2xl p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Report infestation</h2>
            <Button variant="ghost" size="sm" onClick={resetFlow}>
              Back
            </Button>
          </div>
          {handoff ? (
            <p className="mb-3 text-sm text-muted-foreground">
              Observation saved. Finish the infestation report for this cell, or skip.
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
              Skip infestation report
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
