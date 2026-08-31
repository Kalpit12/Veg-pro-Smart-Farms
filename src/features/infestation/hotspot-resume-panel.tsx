"use client";

import { formatDistanceToNow } from "date-fns";
import { MapPin, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { useFieldOpsStore } from "@/store/field-ops-store";
import { useResumeHotspotStore, type ResumeHotspot } from "@/store/resume-hotspot-store";
import { useScanStore } from "@/store/scan-store";
import { listActiveHotspotsForGreenhouse } from "@/services/supabase/infestation-service";

export function HotspotResumePanel() {
  const scan = useScanStore();
  const demoHotspots = useFieldOpsStore((s) => s.demoHotspots);
  const resumeHotspot = useResumeHotspotStore((s) => s.hotspot);
  const setResumeHotspot = useResumeHotspotStore((s) => s.setHotspot);
  const clearResumeHotspot = useResumeHotspotStore((s) => s.clear);
  const [loading, setLoading] = useState(false);
  const [hotspots, setHotspots] = useState<ResumeHotspot[]>([]);

  const loadHotspots = useCallback(async () => {
    if (!scan.greenhouseId) {
      setHotspots([]);
      return;
    }

    if (!hasSupabaseEnv()) {
      setHotspots(
        demoHotspots
          .filter((h) => h.greenhouse_id === scan.greenhouseId && h.status === "active")
          .map((h) => ({
            id: h.id,
            pest_type: h.pest_type,
            main_issue: h.main_issue,
            severity: h.severity,
            latitude: h.latitude,
            longitude: h.longitude,
            greenhouse_id: h.greenhouse_id,
            greenhouse_name: h.greenhouses?.name ?? scan.greenhouseName ?? "—",
            farm_id: h.farm_id,
            farm_name: h.farms?.name ?? scan.farmName ?? "—",
            created_at: h.created_at,
          })),
      );
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await listActiveHotspotsForGreenhouse(scan.greenhouseId);
      if (error) throw error;
      setHotspots(
        (data ?? []).map((h) => ({
          id: h.id,
          pest_type: h.pest_type,
          main_issue: h.main_issue,
          severity: h.severity,
          latitude: h.latitude,
          longitude: h.longitude,
          greenhouse_id: h.greenhouse_id ?? scan.greenhouseId,
          greenhouse_name: scan.greenhouseName ?? "—",
          farm_id: h.farm_id ?? scan.farmId ?? "",
          farm_name: scan.farmName ?? "—",
          created_at: h.created_at,
        })),
      );
    } finally {
      setLoading(false);
    }
  }, [scan.greenhouseId, scan.greenhouseName, scan.farmId, scan.farmName, demoHotspots]);

  useEffect(() => {
    void loadHotspots();
  }, [loadHotspots]);

  const resumeAt = (hotspot: ResumeHotspot) => {
    setResumeHotspot(hotspot);
  };

  if (!scan.greenhouseId) return null;

  return (
    <div className="glass-card space-y-3 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Open hotspots</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Tap Resume here to continue work at the same map point.
          </p>
        </div>
        <MapPin className="size-5 shrink-0 text-primary" />
      </div>

      {resumeHotspot ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
          <p className="font-medium text-primary">Resuming at map point</p>
          <p className="mt-1">
            {resumeHotspot.pest_type} — {resumeHotspot.main_issue}
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {resumeHotspot.latitude.toFixed(5)}, {resumeHotspot.longitude.toFixed(5)}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={clearResumeHotspot}
          >
            <RotateCcw className="mr-1 size-3.5" />
            Clear resume point
          </Button>
        </div>
      ) : null}

      {loading ? (
        <Skeleton className="h-20 w-full rounded-xl" />
      ) : hotspots.length ? (
        <ul className="space-y-2">
          {hotspots.map((hotspot) => (
            <li
              key={hotspot.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-background/70 p-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{hotspot.pest_type}</p>
                  <Badge variant={hotspot.severity >= 4 ? "danger" : "warning"}>
                    Severity {hotspot.severity}/5
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{hotspot.main_issue}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Reported{" "}
                  {formatDistanceToNow(new Date(hotspot.created_at), { addSuffix: true })}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant={resumeHotspot?.id === hotspot.id ? "default" : "outline"}
                onClick={() => resumeAt(hotspot)}
              >
                Resume here
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No open hotspots in {scan.greenhouseName ?? "this greenhouse"}.
        </p>
      )}
    </div>
  );
}
