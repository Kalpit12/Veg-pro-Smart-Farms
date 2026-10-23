"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Square } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { SCOUTING_WALK_FINISHED_EVENT } from "@/lib/scouting-walk-events";
import {
  isScoutingWalkEngaged,
  useScoutingSessionStore,
} from "@/store/scouting-session-store";
import { useScoutingStore } from "@/store/scouting-store";
import { resolveScoutCoords } from "@/lib/cell-gps";
import { captureGps, formatGps } from "@/lib/gps";
import { gpsAnchorForFieldWork } from "@/lib/hotspot-gps";
import {
  DISEASE_OPTIONS,
  DISEASE_SEVERITY_META,
  issueLabel,
  isNoIssueMarker,
  NO_DISEASE,
  NO_PEST,
  PEST_OPTIONS,
  pestCountToSeverity,
  preferredZoneForIssue,
  PLANT_ZONES,
  type DiseaseSeverity,
  type IssueKind,
  type PlantZoneId,
} from "@/lib/plant-zones";
import { hasConfiguredBackend, isOfflineDemo } from "@/lib/data-backend";
import { cn } from "@/lib/utils";
import { useFieldOpsStore } from "@/store/field-ops-store";
import { isLikelyOfflineError, useFieldWriteQueueStore } from "@/store/field-write-queue-store";
import { useResumeHotspotStore } from "@/store/resume-hotspot-store";
import { useScanStore } from "@/store/scan-store";
import { syncScoutingRecordsFromFieldReport } from "@/lib/field-report-scouting-sync";
import { getCurrentUser } from "@/services/supabase/auth-service";
import { reportInfestation } from "@/services/supabase/infestation-service";
import { uploadActivityEvidence } from "@/services/supabase/storage-service";
import {
  formatScoutHandoffNotes,
  scoutRatingToDiseaseSeverity,
  type ScoutCellLocation,
  type ScoutObservationHandoff,
} from "@/lib/scout-observation-flow";

const PlantViewer = dynamic(
  () =>
    import("@/features/infestation/interactive-plant-viewer").then(
      (m) => m.InteractivePlantViewer,
    ),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="mx-auto aspect-[2/3] h-[min(52vh,380px)] w-auto max-w-full rounded-2xl" />
    ),
  },
);

const schema = z.object({
  zone: z.enum(["top", "middle", "lower"]),
  notes: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

type ReportLine =
  | { kind: "pest"; name: string; count: number }
  | { kind: "disease"; name: string; severity: DiseaseSeverity };

function describeReportLine(line: ReportLine, zoneLabel: string) {
  const zone = zoneLabel.toLowerCase();
  if (line.kind === "pest") {
    if (line.name === NO_PEST) {
      return {
        pest_type: NO_PEST,
        problem: `No pest on ${zone}`,
        severityForDb: 1,
      };
    }
    return {
      pest_type: line.name,
      problem: `Pest count: ${line.count} on ${zone}`,
      severityForDb: pestCountToSeverity(line.count),
    };
  }
  if (line.name === NO_DISEASE) {
    return {
      pest_type: NO_DISEASE,
      problem: `No disease on ${zone}`,
      severityForDb: 1,
    };
  }
  return {
    pest_type: line.name,
    problem: `Disease severity ${line.severity}/3 (${DISEASE_SEVERITY_META[line.severity].label}) on ${zone}`,
    severityForDb: line.severity,
  };
}

export function ReportInfestationForm({
  onSuccess,
  onWalkFinished,
  fromObservation,
  initialCell,
}: {
  onSuccess?: () => void;
  /** Called after the greenhouse walk is completed successfully. */
  onWalkFinished?: () => void;
  fromObservation?: ScoutObservationHandoff | null;
  /** Bay × column from the heat map (walk-rows flow). */
  initialCell?: ScoutCellLocation | null;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [gpsLabel, setGpsLabel] = useState("Will capture on submit");
  const [file, setFile] = useState<File | null>(null);
  const [showPlantPicker, setShowPlantPicker] = useState(true);
  const [logPest, setLogPest] = useState(false);
  const [logDisease, setLogDisease] = useState(false);
  const [selectedPests, setSelectedPests] = useState<string[]>([]);
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>([]);
  const [pestCount, setPestCount] = useState(1);
  const [diseaseSeverity, setDiseaseSeverity] = useState<DiseaseSeverity>(2);
  const kindStepRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const scan = useScanStore();
  const resumeHotspot = useResumeHotspotStore((s) => s.hotspot);
  const addDemoHotspot = useFieldOpsStore((s) => s.addDemoHotspot);
  const enqueueInfestation = useFieldWriteQueueStore((s) => s.enqueueInfestation);
  const incrementStopCount = useScoutingSessionStore((s) => s.incrementStopCount);
  const session = useScoutingSessionStore((s) => s.session);
  const walkEngaged = useScoutingSessionStore((s) => s.walkEngaged);
  const activeRoundId = useScoutingStore((s) => s.activeRoundId);
  const canFinishWalk = isScoutingWalkEngaged(
    walkEngaged,
    session,
    activeRoundId,
    hasConfiguredBackend(),
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      notes: "",
    },
  });

  const zoneId = form.watch("zone") as PlantZoneId | undefined;
  const zone = zoneId ? PLANT_ZONES[zoneId] : null;
  const pestOptions = PEST_OPTIONS;
  const diseaseOptions = DISEASE_OPTIONS;
  const hasCountablePests =
    logPest && selectedPests.some((name) => name !== NO_PEST);
  const hasRatedDiseases =
    logDisease && selectedDiseases.some((name) => name !== NO_DISEASE);
  const readyToSubmit =
    Boolean(zoneId) &&
    (logPest || logDisease) &&
    (!logPest || selectedPests.length > 0) &&
    (!logDisease || selectedDiseases.length > 0);

  const mapCell = useMemo(() => {
    if (fromObservation) {
      return { column: fromObservation.column, bay: fromObservation.bay };
    }
    if (initialCell) {
      return { column: initialCell.column, bay: initialCell.bay };
    }
    return null;
  }, [fromObservation, initialCell]);

  const severityButtons = useMemo(
    () =>
      ([1, 2, 3] as DiseaseSeverity[]).map((level) => ({
        level,
        ...DISEASE_SEVERITY_META[level],
      })),
    [],
  );

  const resetIssueSelections = () => {
    setLogPest(false);
    setLogDisease(false);
    setSelectedPests([]);
    setSelectedDiseases([]);
    setPestCount(1);
    setDiseaseSeverity(2);
  };

  const resetAfterSuccess = () => {
    form.reset({ notes: "" });
    resetIssueSelections();
    setFile(null);
    setShowPlantPicker(true);
  };

  const handleZoneSelect = (id: PlantZoneId) => {
    form.setValue("zone", id, { shouldValidate: true });
    setShowPlantPicker(false);
  };

  const toggleLogKind = (kind: IssueKind) => {
    if (kind === "pest") {
      setLogPest((on) => {
        if (on) setSelectedPests([]);
        return !on;
      });
      return;
    }
    setLogDisease((on) => {
      if (on) setSelectedDiseases([]);
      return !on;
    });
  };

  const togglePestSelection = (name: string) => {
    if (name === NO_PEST) {
      setSelectedPests((prev) => (prev.includes(NO_PEST) ? [] : [NO_PEST]));
      return;
    }
    setSelectedPests((prev) => {
      const base = prev.filter((item) => item !== NO_PEST);
      if (base.includes(name)) return base.filter((item) => item !== name);
      return [...base, name];
    });
  };

  const toggleDiseaseSelection = (name: string) => {
    if (name === NO_DISEASE) {
      setSelectedDiseases((prev) => (prev.includes(NO_DISEASE) ? [] : [NO_DISEASE]));
      return;
    }
    setSelectedDiseases((prev) => {
      const base = prev.filter((item) => item !== NO_DISEASE);
      if (base.includes(name)) return base.filter((item) => item !== name);
      return [...base, name];
    });
  };

  const buildReportLines = (): ReportLine[] => {
    const lines: ReportLine[] = [];
    if (logPest) {
      for (const name of selectedPests) {
        if (name === NO_PEST) lines.push({ kind: "pest", name, count: 0 });
        else lines.push({ kind: "pest", name, count: pestCount });
      }
    }
    if (logDisease) {
      for (const name of selectedDiseases) {
        if (name === NO_DISEASE) {
          lines.push({ kind: "disease", name, severity: 1 });
        } else {
          lines.push({ kind: "disease", name, severity: diseaseSeverity });
        }
      }
    }
    return lines;
  };

  const validateMultiLog = (): string | null => {
    if (!logPest && !logDisease) {
      return "Turn on Pest and/or Disease for this plant zone.";
    }
    if (logPest && selectedPests.length === 0) {
      return "Select at least one pest (or NO Pest).";
    }
    if (logDisease && selectedDiseases.length === 0) {
      return "Select at least one disease (or NO Disease).";
    }
    if (hasCountablePests && (!Number.isFinite(pestCount) || pestCount < 1)) {
      return "Enter how many pests you counted.";
    }
    return null;
  };

  useEffect(() => {
    if (!zoneId || showPlantPicker) return;
    const id = window.requestAnimationFrame(() => {
      kindStepRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [zoneId, showPlantPicker]);

  useEffect(() => {
    if (!onWalkFinished) return;
    const onFinished = () => onWalkFinished();
    window.addEventListener(SCOUTING_WALK_FINISHED_EVENT, onFinished);
    return () => window.removeEventListener(SCOUTING_WALK_FINISHED_EVENT, onFinished);
  }, [onWalkFinished]);

  useEffect(() => {
    if (!fromObservation) return;
    resetIssueSelections();
    const nextKind = fromObservation.issueType;
    if (nextKind === "pest") {
      setLogPest(true);
      setSelectedPests([fromObservation.issueName]);
      setPestCount(1);
    } else {
      setLogDisease(true);
      setSelectedDiseases([fromObservation.issueName]);
      setDiseaseSeverity(
        fromObservation.rating != null
          ? scoutRatingToDiseaseSeverity(fromObservation.rating)
          : 2,
      );
    }
    form.setValue("zone", preferredZoneForIssue(fromObservation.issueName), {
      shouldValidate: true,
    });
    setShowPlantPicker(false);
    form.setValue("notes", formatScoutHandoffNotes(fromObservation));
  }, [fromObservation, form]);

  const onSubmit = form.handleSubmit(
    async (values) => {
      if (!scan.farmId) {
        toast({
          title: "GPS location required",
          description: "Wait for live GPS to assign your greenhouse.",
          tone: "error",
        });
        return;
      }

      const validationError = validateMultiLog();
      if (validationError) {
        toast({ title: "Complete the plant report", description: validationError, tone: "error" });
        return;
      }

      const zoneConfig = PLANT_ZONES[values.zone];
      const lines = buildReportLines();
      const notesSuffix = values.notes?.trim() ? `Notes: ${values.notes.trim()}` : null;

      setSubmitting(true);
      try {
        const live = await captureGps({
          allowDemoFallback: isOfflineDemo(),
          anchorFallback: gpsAnchorForFieldWork(resumeHotspot, scan.greenhouseId),
        });
        const coords =
          mapCell && scan.greenhouseId && scan.greenhouseName
            ? resolveScoutCoords({
                live,
                greenhouseId: scan.greenhouseId,
                greenhouseName: scan.greenhouseName,
                column: mapCell.column,
                bay: mapCell.bay,
              })
            : live;
        setGpsLabel(formatGps(coords));

        const offline = typeof navigator !== "undefined" && navigator.onLine === false;

        if (file && !offline && hasConfiguredBackend()) {
          try {
            await uploadActivityEvidence(file);
          } catch {
            toast({
              title: "Photo did not upload",
              description: "Reports will still save without the photo.",
              tone: "default",
            });
          }
        } else if (file && offline) {
          toast({
            title: "Photo skipped while offline",
            description: "Reports are queued. Retake the photo after you reconnect if needed.",
            tone: "default",
          });
        }

        let queuedAny = false;

        if (isOfflineDemo()) {
          for (const line of lines) {
            const detail = describeReportLine(line, zoneConfig.label);
            const mainIssue = [
              `Zone: ${zoneConfig.label}`,
              `Kind: ${line.kind}`,
              notesSuffix,
            ]
              .filter(Boolean)
              .join(" · ");
            addDemoHotspot({
              farmId: scan.farmId!,
              farmName: scan.farmName ?? "Star",
              greenhouseId: scan.greenhouseId,
              greenhouseName: scan.greenhouseName ?? "—",
              latitude: coords.latitude,
              longitude: coords.longitude,
              pest_type: detail.pest_type,
              problem: detail.problem,
              main_issue: mainIssue,
              severity: detail.severityForDb,
            });
          }
          toast({
            title: lines.length === 1 ? "Report saved" : `${lines.length} reports saved`,
            description: "Farm manager will see this to log a spray response.",
            tone: "success",
          });
          resetAfterSuccess();
          onSuccess?.();
          return;
        }

        const user = await getCurrentUser();
        if (!user) {
          toast({ title: "Not signed in", tone: "error" });
          return;
        }

        for (const line of lines) {
          const detail = describeReportLine(line, zoneConfig.label);
          const mainIssue = [
            `Zone: ${zoneConfig.label}`,
            `Kind: ${line.kind}`,
            notesSuffix,
          ]
            .filter(Boolean)
            .join(" · ");

          const payload = {
            farm_id: scan.farmId!,
            greenhouse_id: scan.greenhouseId,
            reported_by: user.id,
            latitude: coords.latitude,
            longitude: coords.longitude,
            pest_type: detail.pest_type,
            problem: detail.problem,
            main_issue: mainIssue,
            severity: detail.severityForDb,
          };

          if (offline) {
            enqueueInfestation(payload);
            queuedAny = true;
            continue;
          }

          const { error } = await reportInfestation(payload);
          if (error) {
            if (isLikelyOfflineError(error)) {
              enqueueInfestation(payload);
              queuedAny = true;
              continue;
            }
            throw error;
          }
        }

        let scoutSyncNote: string | null = null;
        if (
          !queuedAny &&
          mapCell &&
          scan.greenhouseId &&
          scan.greenhouseName
        ) {
          const roundId = session?.roundId ?? null;
          const { saved, error: scoutSyncError } = await syncScoutingRecordsFromFieldReport({
            scoutId: user.id,
            farmId: scan.farmId!,
            greenhouseId: scan.greenhouseId,
            greenhouseName: scan.greenhouseName,
            mapCell,
            lines,
            zoneLabel: zoneConfig.label,
            notes: values.notes?.trim() || null,
            roundId,
            latitude: coords.latitude,
            longitude: coords.longitude,
          });
          if (scoutSyncError) {
            scoutSyncNote =
              "Hotspot saved; scouting KPI row did not sync (check crop varieties in SQL).";
          } else if (saved > 0) {
            incrementStopCount();
          }
        }

        toast({
          title: queuedAny
            ? lines.length === 1
              ? "Report queued"
              : `${lines.length} reports queued`
            : lines.length === 1
              ? "Report saved"
              : `${lines.length} reports saved`,
          description: queuedAny
            ? "No signal — reports will upload when you reconnect."
            : scoutSyncNote ?? "Farm manager will see this to log a spray response.",
          tone: queuedAny ? "default" : "success",
        });
        resetAfterSuccess();
        onSuccess?.();
      } catch (e) {
        toast({
          title: "Could not save report",
          description: e instanceof Error ? e.message : "Unknown error",
          tone: "error",
        });
      } finally {
        setSubmitting(false);
      }
    },
    (errors) => {
      const first = Object.values(errors)[0]?.message;
      toast({
        title: "Complete the plant report",
        description:
          typeof first === "string"
            ? first
            : "Tap a plant zone, then log pest and/or disease.",
        tone: "error",
      });
    },
  );

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      {scan.farmName ? (
        <p className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          Reporting for <span className="font-semibold">{scan.farmName}</span>
          {scan.greenhouseName ? (
            <>
              {" "}
              / <span className="font-semibold">{scan.greenhouseName}</span>
            </>
          ) : null}
          {mapCell ? (
            <span className="mt-1 block text-xs text-muted-foreground">
              {fromObservation ? "After scouting" : "Heat map spot"} · Col {mapCell.column} · Bay{" "}
              {mapCell.bay}
            </span>
          ) : null}
        </p>
      ) : (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
          Waiting for greenhouse — turn on location, or pick a greenhouse in Where are you?
          above.
        </p>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium">1. Tap where you see the issue</p>
        {showPlantPicker || !zone ? (
          <PlantViewer selectedZone={zoneId ?? null} onSelectZone={handleZoneSelect} />
        ) : (
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/10 px-3 py-3 text-left"
            onClick={() => setShowPlantPicker(true)}
          >
            <span>
              <span className="block text-sm font-semibold">{zone.label}</span>
              <span className="text-xs text-muted-foreground">{zone.description}</span>
            </span>
            <span className="shrink-0 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium">
              Change
            </span>
          </button>
        )}
        {form.formState.errors.zone ? (
          <p className="text-sm text-destructive">{form.formState.errors.zone.message}</p>
        ) : null}
      </div>

      {zone ? (
        <div
          ref={kindStepRef}
          className="scroll-mt-20 space-y-3 rounded-2xl border border-border bg-muted/20 p-3"
        >
          {showPlantPicker ? (
            <div>
              <p className="text-sm font-semibold">{zone.label}</p>
              <p className="text-xs text-muted-foreground">{zone.description}</p>
            </div>
          ) : null}

          <div className="space-y-2">
            <span className="text-sm font-medium">2. Log pest and/or disease (tap both if needed)</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={cn(
                  "rounded-xl border px-3 py-3 text-sm font-semibold transition-colors",
                  logPest
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted",
                )}
                onClick={() => toggleLogKind("pest")}
              >
                Pest
                <span className="mt-1 block text-xs font-normal opacity-80">
                  Multi-select + count
                </span>
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-xl border px-3 py-3 text-sm font-semibold transition-colors",
                  logDisease
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted",
                )}
                onClick={() => toggleLogKind("disease")}
              >
                Disease
                <span className="mt-1 block text-xs font-normal opacity-80">
                  Multi-select + severity
                </span>
              </button>
            </div>
          </div>

          {logPest ? (
            <div className="space-y-1">
              <span className="text-sm font-medium">3. Pests for this plant section</span>
              <p className="text-xs text-muted-foreground">
                Full VegPro pest list — tap all that apply (zone: {zone.label.toLowerCase()}).
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-sm font-semibold transition-colors",
                    selectedPests.includes(NO_PEST)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted",
                  )}
                  onClick={() => togglePestSelection(NO_PEST)}
                >
                  {NO_PEST}
                </button>
                {pestOptions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={cn(
                      "rounded-lg border px-2.5 py-1.5 text-sm transition-colors",
                      selectedPests.includes(name)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-muted",
                    )}
                    onClick={() => togglePestSelection(name)}
                  >
                    {issueLabel(name)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {logDisease ? (
            <div className="space-y-1">
              <span className="text-sm font-medium">
                {logPest ? "4. Diseases for this plant section" : "3. Diseases for this plant section"}
              </span>
              <p className="text-xs text-muted-foreground">
                Full VegPro disease list — tap all that apply (zone: {zone.label.toLowerCase()}).
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-sm font-semibold transition-colors",
                    selectedDiseases.includes(NO_DISEASE)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted",
                  )}
                  onClick={() => toggleDiseaseSelection(NO_DISEASE)}
                >
                  {NO_DISEASE}
                </button>
                {diseaseOptions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={cn(
                      "rounded-lg border px-2.5 py-1.5 text-sm transition-colors",
                      selectedDiseases.includes(name)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-muted",
                    )}
                    onClick={() => toggleDiseaseSelection(name)}
                  >
                    {issueLabel(name)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {hasCountablePests ? (
            <label className="block space-y-1">
              <span className="text-sm font-medium">
                {logDisease ? "5. Number counted (pests)" : "4. Number counted (pests)"}
              </span>
              <input
                type="number"
                min={1}
                max={9999}
                value={pestCount}
                onChange={(e) => setPestCount(Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-background px-3 py-3 text-base"
                placeholder="e.g. 12"
              />
            </label>
          ) : null}

          {hasRatedDiseases ? (
            <div className="space-y-1">
              <span className="text-sm font-medium">
                {hasCountablePests
                  ? "6. Disease severity (1–3)"
                  : logPest
                    ? "5. Disease severity (1–3)"
                    : "4. Disease severity (1–3)"}
              </span>
              <div className="grid grid-cols-3 gap-2">
                {severityButtons.map((btn) => (
                  <button
                    key={btn.level}
                    type="button"
                    className={cn(
                      "rounded-xl border px-2 py-3 text-center text-sm font-semibold transition-colors",
                      btn.className,
                      diseaseSeverity === btn.level && "ring-2 ring-offset-2 ring-primary",
                    )}
                    onClick={() => setDiseaseSeverity(btn.level)}
                  >
                    <span className="block text-lg">{btn.level}</span>
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {!logPest && !logDisease ? (
            <p className="text-sm text-muted-foreground">
              Turn on <Badge variant="outline">Pest</Badge>,{" "}
              <Badge variant="outline">Disease</Badge>, or both to continue.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
          Select a plant zone on the flower to continue.
        </p>
      )}

      <label className="block space-y-1">
        <span className="text-sm font-medium">Notes (optional)</span>
        <textarea
          className="min-h-16 w-full rounded-xl border border-border bg-background px-3 py-3 text-base"
          placeholder="Bay / column, extra detail…"
          {...form.register("notes")}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Photo (optional)</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="w-full text-sm"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>

      <p className="text-xs text-muted-foreground">GPS: {gpsLabel}</p>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={submitting || !readyToSubmit}
      >
        {submitting ? "Saving…" : "Submit report"}
      </Button>

      {canFinishWalk ? (
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full"
          disabled={submitting}
          onClick={() => document.getElementById("worker-finish-walking")?.click()}
        >
          <Square className="mr-2 size-4" />
          Finish Walk
          {session?.greenhouseName ? (
            <span className="ml-1 text-xs font-normal opacity-80">
              ({session.greenhouseName})
            </span>
          ) : null}
        </Button>
      ) : null}
    </form>
  );
}
