"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { captureGps, formatGps } from "@/lib/gps";
import { gpsAnchorForFieldWork } from "@/lib/hotspot-gps";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { useFieldOpsStore } from "@/store/field-ops-store";
import { useResumeHotspotStore } from "@/store/resume-hotspot-store";
import { useScanStore } from "@/store/scan-store";
import { getCurrentUser } from "@/services/supabase/auth-service";
import { listActiveHotspots, listActiveHotspotsForGreenhouse, getHotspotById } from "@/services/supabase/infestation-service";
import { logSpray } from "@/services/supabase/spray-service";
import { uploadActivityEvidence } from "@/services/supabase/storage-service";
import { updateHotspotStatus } from "@/services/supabase/infestation-service";

const schema = z.object({
  product_name: z.string().min(2, "Enter product name"),
  notes: z.string().optional(),
  hotspot_id: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type SprayHotspotOption = {
  id: string;
  pest_type: string;
  main_issue: string;
  severity: number;
  farm_id: string;
  greenhouse_id: string | null;
  latitude: number;
  longitude: number;
  farms?: { name?: string } | null;
  greenhouses?: { name?: string } | null;
};

export function LogSprayForm({
  onSuccess,
  audience = "manager",
}: {
  onSuccess?: () => void;
  audience?: "manager" | "worker";
}) {
  const [submitting, setSubmitting] = useState(false);
  const [gpsLabel, setGpsLabel] = useState("Will capture on submit");
  const [file, setFile] = useState<File | null>(null);
  const [hotspots, setHotspots] = useState<SprayHotspotOption[]>([]);
  const { toast } = useToast();
  const scan = useScanStore();
  const resumeHotspot = useResumeHotspotStore((s) => s.hotspot);
  const clearResumeHotspot = useResumeHotspotStore((s) => s.clear);
  const addDemoSpray = useFieldOpsStore((s) => s.addDemoSpray);
  const demoHotspots = useFieldOpsStore((s) => s.demoHotspots);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { product_name: "", notes: "", hotspot_id: "" },
  });

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      const pool =
        audience === "manager"
          ? demoHotspots.filter((h) => h.status === "active")
          : demoHotspots.filter(
              (h) => h.greenhouse_id === scan.greenhouseId && h.status === "active",
            );
      setHotspots(
        pool.map((h) => ({
          id: h.id,
          pest_type: h.pest_type,
          main_issue: h.main_issue,
          severity: h.severity,
          farm_id: h.farm_id,
          greenhouse_id: h.greenhouse_id,
          latitude: h.latitude,
          longitude: h.longitude,
          farms: h.farms,
          greenhouses: h.greenhouses,
        })),
      );
      return;
    }

    if (audience === "manager") {
      void listActiveHotspots(30).then(({ data, error }) => {
        if (!error && data) setHotspots(data as SprayHotspotOption[]);
      });
      return;
    }

    if (!scan.greenhouseId) return;
    void listActiveHotspotsForGreenhouse(scan.greenhouseId).then(({ data, error }) => {
      if (!error && data) setHotspots(data as SprayHotspotOption[]);
    });
  }, [scan.greenhouseId, demoHotspots, audience]);

  useEffect(() => {
    if (resumeHotspot?.id) {
      form.setValue("hotspot_id", resumeHotspot.id);
    }
  }, [resumeHotspot?.id, form]);

  const selectedHotspotId = form.watch("hotspot_id");

  useEffect(() => {
    if (!selectedHotspotId) return;
    const hotspot =
      hotspots.find((h) => h.id === selectedHotspotId) ??
      demoHotspots.find((h) => h.id === selectedHotspotId);
    if (!hotspot) return;

    useResumeHotspotStore.getState().setHotspot({
      id: hotspot.id,
      pest_type: hotspot.pest_type,
      main_issue: hotspot.main_issue,
      severity: "severity" in hotspot ? hotspot.severity : 3,
      latitude: hotspot.latitude,
      longitude: hotspot.longitude,
      greenhouse_id: hotspot.greenhouse_id,
      greenhouse_name: hotspot.greenhouses?.name ?? "—",
      farm_id: hotspot.farm_id,
      farm_name: hotspot.farms?.name ?? "Star",
      created_at: new Date().toISOString(),
    });
    useScanStore.getState().setContext({
      farmId: hotspot.farm_id,
      greenhouseId: hotspot.greenhouse_id,
      farmName: hotspot.farms?.name,
      greenhouseName: hotspot.greenhouses?.name,
    });
  }, [selectedHotspotId, hotspots, demoHotspots]);

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        const hotspotId = values.hotspot_id || null;

        if (audience === "manager" && !hotspotId) {
          toast({
            title: "Select a worker report",
            description:
              "Link this spray to the infestation report you are resolving so the correct greenhouse is recorded.",
            tone: "error",
          });
          return;
        }

        setSubmitting(true);
        try {
          let linkedHotspot = hotspotId
            ? demoHotspots.find((h) => h.id === hotspotId) ??
              hotspots.find((h) => h.id === hotspotId)
            : null;

          if (hotspotId && hasSupabaseEnv()) {
            const { data: authoritative, error: hotspotError } = await getHotspotById(hotspotId);
            if (hotspotError || !authoritative) {
              throw hotspotError ?? new Error("Could not load the selected worker report.");
            }
            linkedHotspot = authoritative as SprayHotspotOption;
          }

          const farmId =
            linkedHotspot?.farm_id ??
            resumeHotspot?.farm_id ??
            scan.farmId ??
            null;
          const greenhouseId =
            linkedHotspot?.greenhouse_id ??
            resumeHotspot?.greenhouse_id ??
            scan.greenhouseId ??
            null;
          const farmName =
            linkedHotspot?.farms?.name ??
            resumeHotspot?.farm_name ??
            scan.farmName ??
            "Star";
          const greenhouseName =
            linkedHotspot?.greenhouses?.name ??
            resumeHotspot?.greenhouse_name ??
            scan.greenhouseName ??
            "—";

          if (!farmId || !greenhouseId) {
            toast({
              title: "Location required",
              description:
                audience === "manager"
                  ? "Select a worker report with a valid greenhouse."
                  : "Wait for live GPS to assign your greenhouse.",
              tone: "error",
            });
            return;
          }

          const coords =
            linkedHotspot != null
              ? {
                  latitude: linkedHotspot.latitude,
                  longitude: linkedHotspot.longitude,
                }
              : resumeHotspot != null
                ? {
                    latitude: resumeHotspot.latitude,
                    longitude: resumeHotspot.longitude,
                  }
                : await captureGps({
                    allowDemoFallback: true,
                    anchorFallback: gpsAnchorForFieldWork(null, greenhouseId),
                  });
          setGpsLabel(formatGps(coords));

          if (!hasSupabaseEnv()) {
            const actorName =
              audience === "manager" ? "Farm manager" : "Field worker";
            addDemoSpray({
              farmId,
              farmName,
              greenhouseId,
              greenhouseName,
              latitude: coords.latitude,
              longitude: coords.longitude,
              product_name: values.product_name,
              notes: values.notes,
              hotspot_id: hotspotId,
              workerName: actorName,
            });
            toast({
              title: "Spray logged",
              description:
                audience === "manager"
                  ? "Visible to admin on history and activity feed."
                  : "Visible on manager map and history.",
              tone: "success",
            });
            form.reset();
            setFile(null);
            if (resumeHotspot?.id === hotspotId) {
              clearResumeHotspot();
            }
            onSuccess?.();
            return;
          }

          const user = await getCurrentUser();
          if (!user) {
            toast({ title: "Not signed in", tone: "error" });
            return;
          }

          let imagePath: string | null = null;
          if (file) {
            imagePath = await uploadActivityEvidence(file);
          }

          const { error } = await logSpray({
            worker_id: user.id,
            hotspot_id: hotspotId,
            farm_id: farmId,
            greenhouse_id: greenhouseId,
            latitude: coords.latitude,
            longitude: coords.longitude,
            product_name: values.product_name,
            notes: values.notes || null,
            image_url: imagePath,
          });

          if (error) throw error;

          if (hotspotId) {
            await updateHotspotStatus(hotspotId, "sprayed");
          }

          if (resumeHotspot?.id === hotspotId) {
            clearResumeHotspot();
          }

          toast({
            title: "Spray logged",
            description:
              audience === "manager"
                ? "Visible to admin on history and activity feed."
                : undefined,
            tone: "success",
          });
          form.reset();
          setFile(null);
          onSuccess?.();
        } catch (e) {
          toast({
            title: "Could not save spray",
            description: e instanceof Error ? e.message : "Unknown error",
            tone: "error",
          });
        } finally {
          setSubmitting(false);
        }
      })}
    >
      {resumeHotspot ? (
        <p className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
          Follow-up at map point: {resumeHotspot.pest_type} ({resumeHotspot.latitude.toFixed(5)},{" "}
          {resumeHotspot.longitude.toFixed(5)})
        </p>
      ) : null}

      {hotspots.length > 0 ? (
        <label className="block space-y-1">
          <span className="text-sm font-medium">
            {audience === "manager"
              ? "Respond to worker report (required)"
              : "Spray at hotspot (optional)"}
          </span>
          <select
            className="w-full rounded-xl border border-border bg-background px-3 py-3 text-base"
            {...form.register("hotspot_id", { required: audience === "manager" })}
          >
            <option value="" disabled={audience === "manager"}>
              {audience === "manager"
                ? "Choose worker report…"
                : "General spray (no hotspot)"}
            </option>
            {hotspots.map((h) => (
              <option key={h.id} value={h.id}>
                {h.greenhouses?.name ?? "—"} — {h.pest_type} severity {h.severity}/5 —{" "}
                {h.main_issue}
              </option>
            ))}
          </select>
        </label>
      ) : audience === "manager" ? (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
          No open worker reports right now. Workers must submit an infestation report before you
          can log a spray response.
        </p>
      ) : null}

      {audience === "manager" && selectedHotspotId ? (
        <p className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
          Spraying at{" "}
          <span className="font-semibold">
            {hotspots.find((h) => h.id === selectedHotspotId)?.greenhouses?.name ??
              resumeHotspot?.greenhouse_name ??
              "—"}
          </span>{" "}
          for severity{" "}
          {hotspots.find((h) => h.id === selectedHotspotId)?.severity ??
            resumeHotspot?.severity ??
            "—"}
          /5
        </p>
      ) : null}

      <label className="block space-y-1">
        <span className="text-sm font-medium">Insecticide product</span>
        <input
          className="w-full rounded-xl border border-border bg-background px-3 py-3 text-base"
          placeholder="e.g. Neem oil"
          {...form.register("product_name")}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Notes (optional)</span>
        <textarea
          className="min-h-16 w-full rounded-xl border border-border bg-background px-3 py-3 text-base"
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

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? "Saving…" : "Log spray"}
      </Button>
    </form>
  );
}
