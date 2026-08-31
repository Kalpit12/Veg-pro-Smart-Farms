"use client";

import { formatDistanceToNow } from "date-fns";
import { Bug, Droplets } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDemoRefresh } from "@/hooks/use-demo-refresh";
import { useRealtimeHotspots } from "@/hooks/use-realtime-hotspots";
import { useToast } from "@/hooks/use-toast";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import {
  listActiveHotspots,
  type HotspotRow,
} from "@/services/supabase/infestation-service";
import { useFieldOpsStore } from "@/store/field-ops-store";
import { useResumeHotspotStore } from "@/store/resume-hotspot-store";
import { useScanStore } from "@/store/scan-store";
import { cn } from "@/lib/utils";

function queueHotspotForSpray(hotspot: HotspotRow) {
  useResumeHotspotStore.getState().setHotspot({
    id: hotspot.id,
    pest_type: hotspot.pest_type,
    main_issue: hotspot.main_issue,
    severity: hotspot.severity,
    latitude: hotspot.latitude,
    longitude: hotspot.longitude,
    greenhouse_id: hotspot.greenhouse_id,
    greenhouse_name: hotspot.greenhouses?.name ?? "—",
    farm_id: hotspot.farm_id,
    farm_name: hotspot.farms?.name ?? "—",
    created_at: hotspot.created_at,
  });
  useScanStore.getState().setContext({
    farmId: hotspot.farm_id,
    greenhouseId: hotspot.greenhouse_id,
    farmName: hotspot.farms?.name,
    greenhouseName: hotspot.greenhouses?.name,
  });
}

type PendingInfestationQueueProps = {
  compact?: boolean;
  className?: string;
};

export function PendingInfestationQueue({
  compact = false,
  className,
}: PendingInfestationQueueProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { tick } = useDemoRefresh();
  const demoHotspots = useFieldOpsStore((s) => s.demoHotspots);
  const [rows, setRows] = useState<HotspotRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!hasSupabaseEnv()) {
      setRows(demoHotspots.filter((h) => h.status === "active"));
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await listActiveHotspots(20);
      if (error) throw error;
      setRows((data as HotspotRow[]) ?? []);
    } catch (e) {
      toast({
        title: "Could not load infestation reports",
        description: e instanceof Error ? e.message : "Unknown error",
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [demoHotspots, toast]);

  useEffect(() => {
    void refresh();
  }, [refresh, tick]);

  useRealtimeHotspots(refresh);

  const handleLogSpray = (hotspot: HotspotRow) => {
    queueHotspotForSpray(hotspot);
    router.push("/manager/spray");
  };

  if (loading) {
    return (
      <div className={cn("glass-card rounded-2xl p-4", className)}>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-3 h-16 w-full" />
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div
        className={cn(
          "glass-card rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4",
          className,
        )}
      >
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          No open infestation reports
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Worker reports will appear here for you to log a spray response.
        </p>
      </div>
    );
  }

  const visible = compact ? rows.slice(0, 3) : rows;

  return (
    <div className={cn("glass-card rounded-2xl p-4", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bug className="size-4 text-destructive" />
          <h2 className="text-sm font-semibold">Worker reports — log spray</h2>
        </div>
        <Badge variant="danger">{rows.length}</Badge>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Infestation reports from the field. Open one to record the spray treatment.
      </p>
      <ul className="space-y-2">
        {visible.map((row) => (
          <li
            key={row.id}
            className="flex flex-col gap-3 rounded-xl border border-border/70 bg-background/70 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{row.pest_type}</p>
                <Badge variant={row.severity >= 4 ? "danger" : "warning"}>
                  {row.severity}/5
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{row.main_issue}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {row.users?.full_name ?? "Worker"} · {row.farms?.name} /{" "}
                {row.greenhouses?.name ?? "—"} ·{" "}
                {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              className="shrink-0"
              onClick={() => handleLogSpray(row)}
            >
              <Droplets className="size-3.5" />
              Log spray
            </Button>
          </li>
        ))}
      </ul>
      {compact && rows.length > visible.length ? (
        <div className="mt-3">
          <Link href="/manager/spray" className={buttonVariants({ size: "sm", variant: "outline" })}>
            View all {rows.length} reports
          </Link>
        </div>
      ) : null}
    </div>
  );
}
