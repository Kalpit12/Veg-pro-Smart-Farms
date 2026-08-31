"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DEMO_FARMS, DEMO_WORKERS } from "@/lib/demo-field-data";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { useRealtimeHotspots } from "@/hooks/use-realtime-hotspots";
import { useRealtimePositions } from "@/hooks/use-realtime-positions";
import { getCurrentUser } from "@/services/supabase/auth-service";
import { listHotspots } from "@/services/supabase/infestation-service";
import { listSpraysForWorker } from "@/services/supabase/spray-service";
import { useToast } from "@/hooks/use-toast";

type LiveStatus = {
  lastAction: string;
  greenhouse: string | null;
  problem: string | null;
  gps: string | null;
  at: string | null;
};

export function WorkerLiveStatus() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState<LiveStatus>({
    lastAction: "No activity yet",
    greenhouse: null,
    problem: null,
    gps: null,
    at: null,
  });

  const refresh = useCallback(async () => {
    if (!hasSupabaseEnv()) {
      const worker = DEMO_WORKERS[0];
      const farm = DEMO_FARMS[worker.farmKey];
      setLive({
        lastAction: worker.task,
        greenhouse: farm.greenhouseName,
        problem: worker.problem,
        gps: `${farm.lat.toFixed(4)},${farm.lng.toFixed(4)}`,
        at: new Date().toISOString(),
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) return;

      const [hotspotsRes, spraysRes] = await Promise.all([
        listHotspots(20),
        listSpraysForWorker(user.id, 1),
      ]);

      if (hotspotsRes.error) throw hotspotsRes.error;
      if (spraysRes.error) throw spraysRes.error;

      const myHotspot = hotspotsRes.data?.find(
        (h) => (h as { reported_by: string }).reported_by === user.id,
      ) as
        | {
            pest_type: string;
            problem: string;
            created_at: string;
            latitude: number;
            longitude: number;
            greenhouses?: { name?: string } | null;
          }
        | undefined;

      const latestSpray = spraysRes.data?.[0] as
        | {
            product_name: string;
            created_at: string;
            greenhouses?: { name?: string } | null;
          }
        | undefined;

      if (latestSpray && (!myHotspot || latestSpray.created_at > myHotspot.created_at)) {
        setLive({
          lastAction: `Spray: ${latestSpray.product_name}`,
          greenhouse: latestSpray.greenhouses?.name ?? null,
          problem: "Treatment logged",
          gps: null,
          at: latestSpray.created_at,
        });
      } else if (myHotspot) {
        setLive({
          lastAction: `Report: ${myHotspot.pest_type}`,
          greenhouse: myHotspot.greenhouses?.name ?? null,
          problem: myHotspot.problem,
          gps: `${myHotspot.latitude},${myHotspot.longitude}`,
          at: myHotspot.created_at,
        });
      } else {
        setLive({
          lastAction: "No activity yet",
          greenhouse: null,
          problem: null,
          gps: null,
          at: null,
        });
      }
    } catch (e) {
      toast({
        title: "Status unavailable",
        description: e instanceof Error ? e.message : "Unknown error",
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useRealtimeHotspots(refresh);
  useRealtimePositions(refresh);

  return (
    <section className="glass-card rounded-2xl p-4">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">My Field Status</h2>
          <p className="text-xs text-muted-foreground">Latest report or spray</p>
        </div>
        <Badge variant={live.at ? "success" : "outline"}>
          {live.at ? "Active" : "Idle"}
        </Badge>
      </header>
      {loading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
          <p className="text-lg font-semibold">{live.lastAction}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Greenhouse: {live.greenhouse ?? "—"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Problem: {live.problem ?? "—"}
          </p>
          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5" />
            {live.gps ?? "GPS on next field action"}
          </p>
          {live.at ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(live.at).toLocaleString()}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
