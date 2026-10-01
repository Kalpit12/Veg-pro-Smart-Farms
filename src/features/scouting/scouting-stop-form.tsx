"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  BEMACK_CATEGORIES,
  BEMACK_VARIETIES,
  bayMaxForGreenhouse,
  baysForGreenhouse,
  columnCountForBay,
  formatAreaSqm,
  greenhouseCellExists,
  issueLabel,
  issuesForType,
  SCOUTING_PARAMETERS,
  starGreenhouseRow,
  varietiesForGreenhouse,
  varietyForBay,
  type BemackCategory,
} from "@/lib/bemack-master-data";
import { resolveScoutCoords } from "@/lib/cell-gps";
import { coordsSnappedToWalkPath } from "@/lib/scout-route-alignment";
import { captureGps, formatGps } from "@/lib/gps";
import { gpsAnchorForFieldWork } from "@/lib/hotspot-gps";
import { hasConfiguredBackend, hasMssqlEnv, isOfflineDemo } from "@/lib/data-backend";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@/services/supabase/auth-service";
import {
  createScoutingRecord,
  listCropCategories,
  listCropVarieties,
  listScoutingParameters,
} from "@/services/supabase/scouting-service";
import { uploadScoutingEvidence } from "@/services/supabase/storage-service";
import type { ScoutCellLocation, ScoutObservationHandoff } from "@/lib/scout-observation-flow";
import { SCOUT_NONE_FOUND } from "@/lib/scout-observation-flow";
import { putEvidenceBlob } from "@/lib/offline-evidence-store";
import { isLikelyOfflineError, useFieldWriteQueueStore } from "@/store/field-write-queue-store";
import { useScoutingRouteBufferStore } from "@/store/scouting-route-buffer-store";
import { useScanStore } from "@/store/scan-store";
import { useResumeHotspotStore } from "@/store/resume-hotspot-store";
import { useScoutingStore } from "@/store/scouting-store";
import {
  isScoutingWalkEngaged,
  useScoutingSessionStore,
} from "@/store/scouting-session-store";

const schema = z.object({
  category: z.enum(BEMACK_CATEGORIES),
  variety: z.string().min(1, "Select a variety"),
  beds: z.number().int().min(1, "Beds must be at least 1").max(999),
  column_no: z.number().int().min(1, "Column must be at least 1").max(999),
  bay_no: z.number().int().min(1, "Bay must be at least 1").max(9999),
  issue_type: z.enum(["disease", "pest"]),
  issue_name: z.string().min(1, "Select a pest or disease"),
  rating: z.number().min(1).max(5).optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type ParamState = Record<string, { present: boolean; rating: number | null }>;

function defaultParams(): ParamState {
  return Object.fromEntries(
    SCOUTING_PARAMETERS.map((p) => [p.id, { present: false, rating: null }]),
  );
}

export function ScoutingStopForm({
  onSuccess,
  initialCell,
  lockLocation = false,
  onChangeCell,
}: {
  onSuccess?: (handoff: ScoutObservationHandoff) => void;
  initialCell?: ScoutCellLocation | null;
  lockLocation?: boolean;
  onChangeCell?: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [gpsLabel, setGpsLabel] = useState("Captured on submit");
  const [params, setParams] = useState<ParamState>(defaultParams);
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();
  const scan = useScanStore();
  const resumeHotspot = useResumeHotspotStore((s) => s.hotspot);
  const addDemo = useScoutingStore((s) => s.addDemoRecord);
  const enqueueScout = useFieldWriteQueueStore((s) => s.enqueueScout);
  const activeRoundId = useScoutingStore((s) => s.activeRoundId);
  const session = useScoutingSessionStore((s) => s.session);
  const walkEngaged = useScoutingSessionStore((s) => s.walkEngaged);
  const incrementStopCount = useScoutingSessionStore((s) => s.incrementStopCount);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: "Cut Rose",
      variety: "",
      beds: 1,
      column_no: 1,
      bay_no: 1,
      issue_type: "pest",
      issue_name: "",
      rating: undefined,
      notes: "",
    },
  });

  const category = form.watch("category") as BemackCategory;
  const issueType = form.watch("issue_type");
  const varieties = useMemo(() => {
    const planted = varietiesForGreenhouse(scan.greenhouseName);
    if (planted.length) return planted;
    return [...BEMACK_VARIETIES[category]];
  }, [category, scan.greenhouseName]);
  const issues = useMemo(() => [...issuesForType(issueType)], [issueType]);
  const bayMax = bayMaxForGreenhouse(scan.greenhouseName);
  const bays = baysForGreenhouse(scan.greenhouseName);
  const planted = starGreenhouseRow(scan.greenhouseName ?? "");
  const bayNo = form.watch("bay_no");
  const colMax = columnCountForBay(scan.greenhouseName, bayNo);
  const roundReady = isScoutingWalkEngaged(
    walkEngaged,
    session,
    activeRoundId,
    hasConfiguredBackend(),
  );

  useEffect(() => {
    if (!scan.greenhouseName) return;
    const currentBay = form.getValues("bay_no");
    if (!currentBay || currentBay > bayMax) {
      form.setValue("bay_no", 1);
    }
  }, [bayMax, form, scan.greenhouseName]);

  useEffect(() => {
    if (!initialCell) return;
    form.setValue("column_no", initialCell.column);
    form.setValue("bay_no", initialCell.bay);
  }, [form, initialCell]);

  useEffect(() => {
    if (!scan.greenhouseName || !bayNo) return;
    form.setValue("variety", varietyForBay(scan.greenhouseName, bayNo));
    const maxCol = columnCountForBay(scan.greenhouseName, bayNo);
    if (form.getValues("column_no") > maxCol) {
      form.setValue("column_no", maxCol);
    }
  }, [bayNo, form, scan.greenhouseName]);

  const location = useMemo(() => {
    if (scan.greenhouseId && scan.farmId) {
      return {
        farmId: scan.farmId,
        farmName: scan.farmName ?? "Star",
        greenhouseId: scan.greenhouseId,
        greenhouseName: scan.greenhouseName ?? "—",
      };
    }
    return null;
  }, [scan]);

  const toggleParam = (id: string, present: boolean) => {
    setParams((prev) => ({
      ...prev,
      [id]: { ...prev[id], present, rating: present ? prev[id]?.rating ?? 3 : null },
    }));
  };

  const setParamRating = (id: string, rating: number) => {
    setParams((prev) => ({
      ...prev,
      [id]: { ...prev[id], present: true, rating },
    }));
  };

  const onSubmit = form.handleSubmit(
    async (values) => {
        if (!location) {
          toast({
            title: "Greenhouse required",
            description: "Confirm your greenhouse in Where are you? above.",
            tone: "error",
          });
          return;
        }

        const roundId = session?.roundId ?? (!hasConfiguredBackend() ? activeRoundId : null);
        if (!roundId) {
          toast({
            title: "Start walking first",
            description: "Tap Start walking so this log is saved on your walk.",
            tone: "error",
          });
          return;
        }
        if (session && session.greenhouseId !== location.greenhouseId) {
          toast({
            title: "Wrong greenhouse",
            description: `This walk is locked to ${session.greenhouseName}. Finish it before changing house.`,
            tone: "error",
          });
          return;
        }

        if (
          !greenhouseCellExists(location.greenhouseName, values.column_no, values.bay_no)
        ) {
          toast({
            title: "That cell is not in this greenhouse",
            description: `${location.greenhouseName} has no column ${values.column_no} in bay ${values.bay_no}. Pick a heat-map cell that exists.`,
            tone: "error",
          });
          return;
        }

        const plantedVariety = varietyForBay(location.greenhouseName, values.bay_no);
        if (plantedVariety && values.variety !== plantedVariety) {
          values = { ...values, variety: plantedVariety };
          form.setValue("variety", plantedVariety);
        }

        setSubmitting(true);
        try {
          const capturedAt = new Date().toISOString();
          const live = await captureGps({
            allowDemoFallback: isOfflineDemo(),
            anchorFallback: gpsAnchorForFieldWork(resumeHotspot, location.greenhouseId),
          });
          const roundIdForSnap = session?.roundId ?? (!hasConfiguredBackend() ? activeRoundId : null);
          const walkCrumbs = roundIdForSnap
            ? useScoutingRouteBufferStore.getState().getPointsForRound(roundIdForSnap)
            : [];
          const snappedLive = coordsSnappedToWalkPath(live, walkCrumbs);
          const coords = resolveScoutCoords({
            live: snappedLive,
            greenhouseId: location.greenhouseId,
            greenhouseName: location.greenhouseName,
            column: values.column_no,
            bay: values.bay_no,
          });
          setGpsLabel(formatGps(coords));

          const observations = SCOUTING_PARAMETERS.filter((p) => params[p.id]?.present).map(
            (p) => ({
              parameterId: p.id,
              present: true,
              rating: params[p.id]?.rating ?? null,
            }),
          );

          if (isOfflineDemo()) {
            addDemo({
              roundId,
              scoutName: "Demo Scout",
              farmName: location.farmName,
              farmId: location.farmId,
              greenhouseName: location.greenhouseName,
              greenhouseId: location.greenhouseId,
              category: values.category,
              variety: values.variety,
              beds: values.beds,
              columnNo: values.column_no,
              bayNo: values.bay_no,
              issueType: values.issue_type,
              issue: values.issue_name,
              rating: values.rating ?? null,
              latitude: coords.latitude,
              longitude: coords.longitude,
              recordedAt: capturedAt,
              imageUrl: file ? `demo-photo://${file.name}` : null,
              observations,
            });
            toast({ title: "Scouting stop saved", tone: "success" });
            incrementStopCount();
            form.reset({ ...form.getValues(), variety: "", issue_name: "", rating: undefined, notes: "" });
            setParams(defaultParams());
            setFile(null);
            onSuccess?.({
              beds: values.beds,
              column: values.column_no,
              bay: values.bay_no,
              issueType: values.issue_type,
              issueName: values.issue_name,
              rating: values.rating,
            });
            return;
          }

          const user = await getCurrentUser();
          if (!user) {
            toast({ title: "Not signed in", tone: "error" });
            return;
          }

          if (!hasMssqlEnv()) {
            const supabase = createClient();
            const { data: profile } = await supabase
              .from("users")
              .select("id")
              .eq("id", user.id)
              .maybeSingle();
            if (!profile) {
              toast({
                title: "Worker profile missing",
                description:
                  "Run supabase/link-auth-users.sql for this account in Supabase.",
                tone: "error",
              });
              return;
            }
          }

          const [cats, varieties, parameters] = await Promise.all([
            listCropCategories(),
            listCropVarieties(),
            listScoutingParameters(),
          ]);
          const svcErr = cats.error ?? varieties.error ?? parameters.error;
          if (svcErr) {
            throw new Error(
              typeof svcErr === "object" && svcErr && "message" in svcErr
                ? String((svcErr as { message: string }).message)
                : String(svcErr),
            );
          }

          const catRow = cats.data?.find((c) => c.name === values.category);
          const varRow = varieties.data?.find(
            (v) => v.name === values.variety && v.category_id === catRow?.id,
          );
          if (!catRow || !varRow) {
            toast({
              title: "Master data missing",
              description: hasMssqlEnv()
                ? "Run sql/mssql/002_seed_bemack_core.sql on the Scouting database."
                : "Run Supabase migration 016 (Star farm seed).",
              tone: "error",
            });
            return;
          }

          const paramRows = parameters.data ?? [];
          const presentParams = SCOUTING_PARAMETERS.filter((p) => params[p.id]?.present);
          const obsInputs = presentParams
            .map((p) => {
              const row = paramRows.find((r) => r.param_key === p.id);
              return row
                ? {
                    parameter_id: row.id,
                    present: true,
                    rating: params[p.id]?.rating ?? null,
                  }
                : null;
            })
            .filter(Boolean) as { parameter_id: string; present: boolean; rating: number | null }[];

          if (presentParams.length && obsInputs.length < presentParams.length) {
            toast({
              title: "Some parameters could not be saved",
              description:
                "A checked parameter is missing from the database. Run Star farm seed (migration 016).",
              tone: "error",
            });
            return;
          }

          const offline =
            typeof navigator !== "undefined" && navigator.onLine === false;

          let imagePath: string | null = null;
          let pendingPhoto:
            | { blobKey: string; fileName: string; contentType: string }
            | undefined;
          if (file && !offline) {
            try {
              imagePath = await uploadScoutingEvidence(file);
            } catch (uploadError) {
              if (isLikelyOfflineError(uploadError) && file) {
                const blobKey = `scout-${crypto.randomUUID()}`;
                await putEvidenceBlob(blobKey, file, {
                  fileName: file.name,
                  contentType: file.type || "image/jpeg",
                });
                pendingPhoto = {
                  blobKey,
                  fileName: file.name,
                  contentType: file.type || "image/jpeg",
                };
              } else if (!isLikelyOfflineError(uploadError)) {
                toast({
                  title: "Photo did not upload",
                  description: "Stop will still save without the photo.",
                  tone: "default",
                });
              }
            }
          } else if (file && offline) {
            const blobKey = `scout-${crypto.randomUUID()}`;
            await putEvidenceBlob(blobKey, file, {
              fileName: file.name,
              contentType: file.type || "image/jpeg",
            });
            pendingPhoto = {
              blobKey,
              fileName: file.name,
              contentType: file.type || "image/jpeg",
            };
            toast({
              title: "Photo queued offline",
              description: "Photo will upload with this stop when you reconnect.",
              tone: "default",
            });
          }

          const payload = {
            scout_id: user.id,
            farm_id: location.farmId,
            greenhouse_id: location.greenhouseId,
            category_id: catRow.id,
            variety_id: varRow.id,
            beds: values.beds,
            column_no: values.column_no,
            bay_no: values.bay_no,
            issue_type: values.issue_type,
            issue_name: values.issue_name,
            rating: values.rating ?? null,
            round_id: roundId,
            latitude: coords.latitude,
            longitude: coords.longitude,
            notes: values.notes || null,
            recorded_at: capturedAt,
            image_url: imagePath,
            observations: obsInputs,
          };

          const finishSaved = (queued: boolean) => {
            incrementStopCount();
            toast({
              title: queued ? "Scouting stop queued" : "Scouting stop saved",
              description: queued
                ? pendingPhoto
                  ? "No signal — stop + photo will upload when you reconnect."
                  : "No signal — this stop will upload when you reconnect."
                : imagePath
                  ? "Photo evidence attached."
                  : undefined,
              tone: queued ? "default" : "success",
            });
            form.reset({
              ...form.getValues(),
              variety: "",
              issue_name: "",
              rating: undefined,
              notes: "",
            });
            setParams(defaultParams());
            setFile(null);
            onSuccess?.({
              beds: values.beds,
              column: values.column_no,
              bay: values.bay_no,
              issueType: values.issue_type,
              issueName: values.issue_name,
              rating: values.rating,
            });
          };

          if (offline || pendingPhoto) {
            enqueueScout(payload, { pendingPhoto });
            finishSaved(true);
            return;
          }

          const { error } = await createScoutingRecord(payload);

          if (error) {
            if (isLikelyOfflineError(error)) {
              enqueueScout(payload, { pendingPhoto });
              finishSaved(true);
              return;
            }
            throw error;
          }

          finishSaved(false);
        } catch (e) {
          const msg =
            e instanceof Error
              ? e.message
              : typeof e === "object" && e && "message" in e
                ? String((e as { message: unknown }).message)
                : "Unknown error";
          toast({
            title: "Could not save scouting stop",
            description: msg,
            tone: "error",
          });
        } finally {
          setSubmitting(false);
        }
    },
    (errors) => {
      const first = Object.values(errors)[0]?.message;
      toast({
        title: "Fix the form before saving",
        description: typeof first === "string" ? first : "Check variety and issue fields.",
        tone: "error",
      });
    },
  );

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      {location ? (
        <p className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          <span className="font-medium">{location.farmName}</span>
          {" / "}
          <span className="font-medium">{location.greenhouseName}</span>
          {scan.greenhouseName ? (
            <span className="mt-1 block text-xs text-muted-foreground">
              {planted.varieties.join(" / ")} · {formatAreaSqm(planted.areaSqm)} · {planted.bayMax}{" "}
              bays
            </span>
          ) : null}
        </p>
      ) : (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
          Waiting for greenhouse — pick one in Where are you? above.
        </p>
      )}

      {!roundReady ? (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
          Tap <span className="font-medium">Start walking</span> first so this log stays on your
          walk.
        </p>
      ) : null}

      <label className="block space-y-1">
        <span className="text-sm font-medium">Category</span>
        <select
          className="w-full rounded-xl border border-border bg-background px-3 py-3 text-base"
          {...form.register("category")}
          onChange={(e) => {
            form.setValue("category", e.target.value as BemackCategory);
            form.setValue("variety", "");
          }}
        >
          {BEMACK_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Variety</span>
        <select
          className="w-full rounded-xl border border-border bg-background px-3 py-3 text-base"
          data-testid="scout-variety"
          {...form.register("variety")}
        >
          <option value="">Select variety</option>
          {varieties.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        {form.formState.errors.variety ? (
          <p className="text-sm text-destructive">{form.formState.errors.variety.message}</p>
        ) : null}
      </label>

      {lockLocation && initialCell ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 px-3 py-3">
          <input type="hidden" {...form.register("beds", { valueAsNumber: true })} />
          <input type="hidden" {...form.register("column_no", { valueAsNumber: true })} />
          <input type="hidden" {...form.register("bay_no", { valueAsNumber: true })} />
          <p className="text-sm">
            <span className="font-medium">Heat map cell</span>
            {" · "}
            Col {initialCell.column} · Bay {initialCell.bay}
          </p>
          {onChangeCell ? (
            <Button type="button" variant="ghost" size="sm" onClick={onChangeCell}>
              Change cell
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <label className="block space-y-1">
            <span className="text-xs font-medium">Bed no.</span>
            <input
              type="number"
              min={1}
              className="w-full rounded-xl border border-border bg-background px-3 py-3 text-base"
              {...form.register("beds", { valueAsNumber: true })}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium">Column (1–{colMax})</span>
            <input
              type="number"
              min={1}
              max={colMax}
              className="w-full rounded-xl border border-border bg-background px-3 py-3 text-base"
              {...form.register("column_no", { valueAsNumber: true })}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium">Bay (1–{bayMax})</span>
            <select
              className="w-full rounded-xl border border-border bg-background px-3 py-3 text-base"
              {...form.register("bay_no", { valueAsNumber: true })}
            >
              {bays.map((bay) => (
                <option key={bay} value={bay}>
                  {bay}
                  {scan.greenhouseName
                    ? ` · ${varietyForBay(scan.greenhouseName, bay)}`
                    : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <fieldset className="space-y-3 rounded-xl border border-border p-4">
        <legend className="px-1 text-sm font-semibold">Primary issue (VegPro pest & disease list)</legend>
        <p className="text-xs text-muted-foreground">
          Choose {SCOUT_NONE_FOUND} if this cell is clean. That keeps coverage accurate without
          inventing a pest or disease.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          data-testid="cell-clean"
          onClick={() => {
            form.setValue("issue_name", SCOUT_NONE_FOUND, { shouldValidate: true });
            form.setValue("rating", undefined);
          }}
        >
          Cell clean — {SCOUT_NONE_FOUND}
        </Button>
        <div className="flex gap-2">
          {(["pest", "disease"] as const).map((t) => (
            <label key={t} className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 has-[:checked]:border-primary has-[:checked]:bg-primary/10">
              <input
                type="radio"
                value={t}
                className="size-4"
                {...form.register("issue_type")}
                onChange={(e) => {
                  form.setValue("issue_type", e.target.value as "pest" | "disease");
                  form.setValue("issue_name", "");
                }}
              />
              <span className="text-sm capitalize">{t}</span>
            </label>
          ))}
        </div>
        <select
          className="w-full rounded-xl border border-border bg-background px-3 py-3 text-base"
          data-testid="scout-issue"
          {...form.register("issue_name")}
        >
          <option value="">Select {issueType}</option>
          <option value={SCOUT_NONE_FOUND}>{SCOUT_NONE_FOUND}</option>
            {issues.map((i) => (
            <option key={i} value={i}>
              {issueLabel(i)}
            </option>
          ))}
        </select>
        {form.formState.errors.issue_name ? (
          <p className="text-sm text-destructive">{form.formState.errors.issue_name.message}</p>
        ) : null}
        <label className="block space-y-1">
          <span className="text-xs font-medium">Severity rating (1–5, optional)</span>
          <input
            type="number"
            min={1}
            max={5}
            placeholder="—"
            className="w-full rounded-xl border border-border bg-background px-3 py-3 text-base"
            {...form.register("rating", {
              setValueAs: (v) =>
                v === "" || v == null || Number.isNaN(Number(v)) ? undefined : Number(v),
            })}
          />
        </label>
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border border-border p-4">
        <legend className="px-1 text-sm font-semibold">
          Scouting parameters ({SCOUTING_PARAMETERS.length}) — checkbox + scale
        </legend>
        <p className="text-xs text-muted-foreground">
          Precision scouting (Scarab-style): mark present pests, diseases, and crop health.
        </p>
        <ul className="space-y-3">
          {SCOUTING_PARAMETERS.map((p) => {
            const state = params[p.id];
            return (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 px-3 py-2"
              >
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={state?.present ?? false}
                    onChange={(e) => toggleParam(p.id, e.target.checked)}
                    className="size-4 shrink-0"
                  />
                  <span className="text-sm">
                    <span className="text-xs uppercase text-muted-foreground">{p.group}</span>
                    {" · "}
                    {p.name}
                  </span>
                </label>
                {state?.present ? (
                  <select
                    className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
                    value={state.rating ?? 3}
                    onChange={(e) => setParamRating(p.id, Number(e.target.value))}
                    aria-label={`Rating for ${p.name}`}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}/5
                      </option>
                    ))}
                  </select>
                ) : null}
              </li>
            );
          })}
        </ul>
      </fieldset>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Notes (optional)</span>
        <textarea
          className="min-h-16 w-full rounded-xl border border-border bg-background px-3 py-3 text-base"
          {...form.register("notes")}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Photo evidence (optional)</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          data-testid="scout-photo"
          className="w-full text-sm"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <p className="text-xs text-muted-foreground">Selected: {file.name}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Attach a leaf/pest photo for manager audit. Skipped if you are offline.
          </p>
        )}
      </label>

      <p className="text-xs text-muted-foreground">GPS: {gpsLabel}</p>

      <Button type="submit" size="lg" className="w-full" disabled={submitting || !roundReady}>
        {submitting ? "Saving…" : "Save scouting stop"}
      </Button>
    </form>
  );
}
