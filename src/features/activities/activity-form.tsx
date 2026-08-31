"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useScanStore } from "@/store/scan-store";
import { getCurrentUser } from "@/services/supabase/auth-service";
import { submitActivity } from "@/services/supabase/activity-service";
import { uploadActivityEvidence } from "@/services/supabase/storage-service";
import { hasSupabaseEnv } from "@/lib/supabase/config";

const schema = z.object({
  activity_type: z.string().min(3),
  notes: z.string().min(5),
});

type FormValues = z.infer<typeof schema>;

export function ActivityForm() {
  const [coords, setCoords] = useState<string>("Not captured");
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { activity_type: "", notes: "" },
  });
  const { toast } = useToast();
  const scan = useScanStore();

  const onCaptureGps = () => {
    if (!("geolocation" in navigator)) {
      setCoords("Unavailable");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords(`${position.coords.latitude},${position.coords.longitude}`);
      },
      () => {
        setCoords("Permission denied");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <form
      className="glass-card space-y-3 rounded-2xl p-4"
      onSubmit={form.handleSubmit(async (values) => {
        try {
          if (!scan.farmId) {
            toast({
              title: "Scan a farm QR first",
              description: "Resolve a QR code to set the farm/greenhouse context.",
              tone: "error",
            });
            return;
          }
          setSubmitting(true);

          if (!hasSupabaseEnv()) {
            toast({
              title: "Demo activity submitted",
              description: "Connect Supabase to persist this submission.",
              tone: "success",
            });
            form.reset();
            setFile(null);
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

          const { error } = await submitActivity({
            worker_id: user.id,
            farm_id: scan.farmId,
            greenhouse_id: scan.greenhouseId,
            activity_type: values.activity_type,
            notes: values.notes,
            image_url: imagePath,
            gps_location: coords === "Not captured" ? null : coords,
          });
          if (error) throw error;

          toast({
            title: "Activity submitted",
            description: "Supervisor will be able to review it instantly.",
            tone: "success",
          });
          form.reset();
          setFile(null);
        } catch (e) {
          toast({
            title: "Submission failed",
            description: e instanceof Error ? e.message : "Unknown error",
            tone: "error",
          });
        } finally {
          setSubmitting(false);
        }
      })}
    >
      <h2 className="text-lg font-semibold">Submit Farm Activity</h2>
      <div className="rounded-xl bg-background/60 p-3 text-sm">
        <p className="text-xs text-muted-foreground">Context</p>
        <p className="mt-1">
          Farm: <span className="font-semibold">{scan.farmName ?? "—"}</span>
        </p>
        <p>
          Greenhouse:{" "}
          <span className="font-semibold">{scan.greenhouseName ?? "—"}</span>
        </p>
      </div>
      <input
        className="w-full rounded-lg border border-border bg-background p-3 text-sm"
        placeholder="Activity type (e.g., Irrigation)"
        {...form.register("activity_type")}
      />
      <textarea
        className="min-h-24 w-full rounded-lg border border-border bg-background p-3 text-sm"
        placeholder="Notes and observations"
        {...form.register("notes")}
      />
      <input
        type="file"
        accept="image/*"
        className="w-full text-sm"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={onCaptureGps}>
          Capture GPS
        </Button>
        <span className="text-xs text-muted-foreground">{coords}</span>
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        Submit Activity
      </Button>
    </form>
  );
}
