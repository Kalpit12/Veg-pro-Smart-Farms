"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { resolveScoutCoords } from "@/lib/cell-gps";
import { captureGps, formatGps } from "@/lib/gps";
import { gpsAnchorForFieldWork } from "@/lib/hotspot-gps";
import {
  DISEASE_SEVERITY_META,
  issueAllowedInZone,
  issueLabel,
  issuesForPlantZone,
  pestCountToSeverity,
  preferredZoneForIssue,
  PLANT_ZONES,
  type DiseaseSeverity,
  type IssueKind,
  type PlantZoneId,
} from "@/lib/plant-zones";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";
import { useFieldOpsStore } from "@/store/field-ops-store";
import { isLikelyOfflineError, useFieldWriteQueueStore } from "@/store/field-write-queue-store";
import { useResumeHotspotStore } from "@/store/resume-hotspot-store";
import { useScanStore } from "@/store/scan-store";
import { getCurrentUser } from "@/services/supabase/auth-service";
import { reportInfestation } from "@/services/supabase/infestation-service";
import { uploadActivityEvidence } from "@/services/supabase/storage-service";
import {
  formatScoutHandoffNotes,
  scoutRatingToDiseaseSeverity,
  type ScoutObservationHandoff,
} from "@/lib/scout-observation-flow";

const PlantViewer = dynamic(
  () =>
    import("@/features/infestation/interactive-plant-viewer").then(
      (m) => m.InteractivePlantViewer,
    ),
  { ssr: false, loading: () => <Skeleton className="aspect-[2/3] w-full rounded-2xl" /> },
);

const schema = z
  .object({
    zone: z.enum(["top", "middle", "lower"]),
    kind: z.enum(["pest", "disease"]),
    issue_name: z.string().trim().min(2, "Select a pest or disease"),
    count: z.number().int().min(1).max(9999).optional(),
    severity: z.number().min(1).max(3).optional(),
    notes: z.string().trim().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.kind === "pest") {
      if (values.count == null || values.count < 1) {
        ctx.addIssue({
          code: "custom",
          path: ["count"],
          message: "Enter how many pests you counted",
        });
      }
    } else if (values.severity == null || values.severity < 1 || values.severity > 3) {
      ctx.addIssue({
        code: "custom",
        path: ["severity"],
        message: "Pick disease severity 1–3",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

export function ReportInfestationForm({
  onSuccess,
  fromObservation,
}: {
  onSuccess?: () => void;
  fromObservation?: ScoutObservationHandoff | null;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [gpsLabel, setGpsLabel] = useState("Will capture on submit");
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();
  const scan = useScanStore();
  const resumeHotspot = useResumeHotspotStore((s) => s.hotspot);
  const addDemoHotspot = useFieldOpsStore((s) => s.addDemoHotspot);
  const enqueueInfestation = useFieldWriteQueueStore((s) => s.enqueueInfestation);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      issue_name: "",
      notes: "",
    },
  });

  const zoneId = form.watch("zone") as PlantZoneId | undefined;
  const kind = form.watch("kind") as IssueKind | undefined;
  const issueName = form.watch("issue_name");
  const severity = form.watch("severity") as DiseaseSeverity | undefined;
  const zone = zoneId ? PLANT_ZONES[zoneId] : null;

  const options = zoneId && kind ? issuesForPlantZone(kind, zoneId) : [];

  const severityButtons = useMemo(
    () =>
      ([1, 2, 3] as DiseaseSeverity[]).map((level) => ({
        level,
        ...DISEASE_SEVERITY_META[level],
      })),
    [],
  );

  const handleZoneSelect = (id: PlantZoneId) => {
    form.setValue("zone", id, { shouldValidate: true });
    const current = form.getValues("issue_name");
    const currentKind = form.getValues("kind") as IssueKind | undefined;
    if (current && currentKind && !issueAllowedInZone(current, id)) {
      form.setValue("issue_name", "", { shouldValidate: false });
    }
  };

  const handleKindSelect = (next: IssueKind) => {
    const prev = form.getValues("kind");
    form.setValue("kind", next, { shouldValidate: true });
    if (prev !== next) {
      form.setValue("issue_name", "", { shouldValidate: false });
    }
    if (next === "pest") {
      form.setValue("severity", undefined);
      form.setValue("count", form.getValues("count") ?? 1);
    } else {
      form.setValue("count", undefined);
      form.setValue("severity", form.getValues("severity") ?? 2);
    }
  };

  useEffect(() => {
    if (!fromObservation) return;
    const nextKind = fromObservation.issueType;
    form.setValue("kind", nextKind, { shouldValidate: true });
    if (nextKind === "pest") {
      form.setValue("severity", undefined);
      form.setValue("count", form.getValues("count") ?? 1);
    } else {
      form.setValue("count", undefined);
      form.setValue(
        "severity",
        fromObservation.rating != null
          ? scoutRatingToDiseaseSeverity(fromObservation.rating)
          : (form.getValues("severity") ?? 2),
        { shouldValidate: true },
      );
    }
    if (nextKind === "pest" || nextKind === "disease") {
      form.setValue("issue_name", fromObservation.issueName, { shouldValidate: false });
      form.setValue("zone", preferredZoneForIssue(fromObservation.issueName), {
        shouldValidate: true,
      });
    }
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

      const zoneConfig = PLANT_ZONES[values.zone];
      if (!issueAllowedInZone(values.issue_name, values.zone)) {
        toast({
          title: "Issue does not match that plant part",
          description: `${values.issue_name} is not scored on ${zoneConfig.label}. Use the highlighted zone for this pest or disease.`,
          tone: "error",
        });
        return;
      }
      const isPest = values.kind === "pest";
      const count = values.count ?? 0;
      const diseaseSeverity = (values.severity ?? 2) as DiseaseSeverity;
      const severityForDb = isPest ? pestCountToSeverity(count) : diseaseSeverity;

      const problem = isPest
        ? `Pest count: ${count} on ${zoneConfig.label.toLowerCase()}`
        : `Disease severity ${diseaseSeverity}/3 (${DISEASE_SEVERITY_META[diseaseSeverity].label}) on ${zoneConfig.label.toLowerCase()}`;

      const mainIssue = [
        `Zone: ${zoneConfig.label}`,
        `Kind: ${values.kind}`,
        values.notes?.trim() ? `Notes: ${values.notes.trim()}` : null,
      ]
        .filter(Boolean)
        .join(" · ");

      setSubmitting(true);
      try {
        const live = await captureGps({
          allowDemoFallback: true,
          anchorFallback: gpsAnchorForFieldWork(resumeHotspot, scan.greenhouseId),
        });
        const coords =
          fromObservation && scan.greenhouseId && scan.greenhouseName
            ? resolveScoutCoords({
                live,
                greenhouseId: scan.greenhouseId,
                greenhouseName: scan.greenhouseName,
                column: fromObservation.column,
                bay: fromObservation.bay,
              })
            : live;
        setGpsLabel(formatGps(coords));

        if (!hasSupabaseEnv()) {
          addDemoHotspot({
            farmId: scan.farmId!,
            farmName: scan.farmName ?? "Star",
            greenhouseId: scan.greenhouseId,
            greenhouseName: scan.greenhouseName ?? "—",
            latitude: coords.latitude,
            longitude: coords.longitude,
            pest_type: values.issue_name,
            problem,
            main_issue: mainIssue,
            severity: severityForDb,
          });
          toast({
            title: isPest ? "Pest reported" : "Disease reported",
            description: "Farm manager will see this to log a spray response.",
            tone: "success",
          });
          form.reset({ issue_name: "", notes: "" });
          setFile(null);
          onSuccess?.();
          return;
        }

        const user = await getCurrentUser();
        if (!user) {
          toast({ title: "Not signed in", tone: "error" });
          return;
        }

        if (file) {
          await uploadActivityEvidence(file);
        }

        const payload = {
          farm_id: scan.farmId!,
          greenhouse_id: scan.greenhouseId,
          reported_by: user.id,
          latitude: coords.latitude,
          longitude: coords.longitude,
          pest_type: values.issue_name,
          problem,
          main_issue: mainIssue,
          severity: severityForDb,
        };

        const finishReport = (queued: boolean) => {
          toast({
            title: queued
              ? "Report queued"
              : isPest
                ? "Pest reported"
                : "Disease reported",
            description: queued
              ? "No signal — this report will upload when you reconnect."
              : "Farm manager will see this to log a spray response.",
            tone: queued ? "default" : "success",
          });
          form.reset({ issue_name: "", notes: "" });
          setFile(null);
          onSuccess?.();
        };

        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          enqueueInfestation(payload);
          finishReport(true);
          return;
        }

        const { error } = await reportInfestation(payload);

        if (error) {
          if (isLikelyOfflineError(error)) {
            enqueueInfestation(payload);
            finishReport(true);
            return;
          }
          throw error;
        }

        finishReport(false);
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
            : "Tap a plant zone, choose pest or disease, then fill details.",
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
          {fromObservation ? (
            <span className="mt-1 block text-xs text-muted-foreground">
              After scouting Col {fromObservation.column} · Bay {fromObservation.bay}
            </span>
          ) : null}
        </p>
      ) : (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
          Waiting for GPS — allow location access on the Field work page, or pick a
          greenhouse in Live GPS above.
        </p>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium">1. Tap where you see the issue</p>
        <PlantViewer selectedZone={zoneId ?? null} onSelectZone={handleZoneSelect} />
        {form.formState.errors.zone ? (
          <p className="text-sm text-destructive">{form.formState.errors.zone.message}</p>
        ) : null}
      </div>

      {zone ? (
        <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-3">
          <div>
            <p className="text-sm font-semibold">{zone.label}</p>
            <p className="text-xs text-muted-foreground">{zone.description}</p>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">2. Is this a pest or a disease?</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={cn(
                  "rounded-xl border px-3 py-3 text-sm font-semibold transition-colors",
                  kind === "pest"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted",
                )}
                onClick={() => handleKindSelect("pest")}
              >
                Pest
                <span className="mt-1 block text-xs font-normal opacity-80">
                  Type + count
                </span>
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-xl border px-3 py-3 text-sm font-semibold transition-colors",
                  kind === "disease"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted",
                )}
                onClick={() => handleKindSelect("disease")}
              >
                Disease
                <span className="mt-1 block text-xs font-normal opacity-80">
                  Severity 1–3
                </span>
              </button>
            </div>
            {form.formState.errors.kind ? (
              <p className="text-sm text-destructive">{form.formState.errors.kind.message}</p>
            ) : null}
          </div>

          {kind ? (
            <>
              <div className="space-y-1">
                <span className="text-sm font-medium">
                  3. {kind === "pest" ? "Pest type" : "Disease"} for this plant section
                </span>
                <p className="text-xs text-muted-foreground">
                  VegPro list — only issues that affect the {zone.label.toLowerCase()} are shown.
                </p>
                <div className="flex flex-wrap gap-2">
                  {options.map((name) => (
                    <button
                      key={name}
                      type="button"
                      className={cn(
                        "rounded-lg border px-2.5 py-1.5 text-sm transition-colors",
                        issueName === name
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:bg-muted",
                      )}
                      onClick={() =>
                        form.setValue("issue_name", name, { shouldValidate: true })
                      }
                    >
                      {issueLabel(name)}
                    </button>
                  ))}
                </div>
                {form.formState.errors.issue_name ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.issue_name.message}
                  </p>
                ) : null}
              </div>

              {kind === "pest" ? (
                <label className="block space-y-1">
                  <span className="text-sm font-medium">4. Number counted</span>
                  <input
                    type="number"
                    min={1}
                    max={9999}
                    className="w-full rounded-xl border border-border bg-background px-3 py-3 text-base"
                    placeholder="e.g. 12"
                    {...form.register("count", { valueAsNumber: true })}
                  />
                  {form.formState.errors.count ? (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.count.message}
                    </p>
                  ) : null}
                </label>
              ) : (
                <div className="space-y-1">
                  <span className="text-sm font-medium">4. Disease severity (1–3)</span>
                  <div className="grid grid-cols-3 gap-2">
                    {severityButtons.map((btn) => (
                      <button
                        key={btn.level}
                        type="button"
                        className={cn(
                          "rounded-xl border px-2 py-3 text-center text-sm font-semibold transition-colors",
                          btn.className,
                          severity === btn.level && "ring-2 ring-offset-2 ring-primary",
                        )}
                        onClick={() =>
                          form.setValue("severity", btn.level, { shouldValidate: true })
                        }
                      >
                        <span className="block text-lg">{btn.level}</span>
                        {btn.label}
                      </button>
                    ))}
                  </div>
                  {form.formState.errors.severity ? (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.severity.message}
                    </p>
                  ) : null}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Choose <Badge variant="outline">Pest</Badge> or{" "}
              <Badge variant="outline">Disease</Badge> to continue.
            </p>
          )}
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
        disabled={submitting || !zone || !kind}
      >
        {submitting ? "Saving…" : "Submit report"}
      </Button>
    </form>
  );
}
