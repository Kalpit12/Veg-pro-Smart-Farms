"use client";

import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { QrCode } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardPageHeader } from "@/features/dashboard/components/dashboard-page-header";
import { WorkerLiveStatus } from "@/features/workers/worker-live-status";
import { useRealtimeFieldFeed } from "@/hooks/use-realtime-field-feed";
import { useToast } from "@/hooks/use-toast";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { useFieldOpsStore } from "@/store/field-ops-store";
import { useScoutingStore } from "@/store/scouting-store";
import { getCurrentUser } from "@/services/supabase/auth-service";
import { listHotspots } from "@/services/supabase/infestation-service";
import { listScoutingRecords } from "@/services/supabase/scouting-service";

type FieldAction = {
  id: string;
  kind: "report" | "scout";
  title: string;
  greenhouse: string;
  created_at: string;
};

export function WorkerDashboard() {
  const { toast } = useToast();
  const [items, setItems] = useState<FieldAction[]>([]);
  const [loading, setLoading] = useState(true);

  const demoHotspots = useFieldOpsStore((s) => s.demoHotspots);
  const demoScouting = useScoutingStore((s) => s.demoRecords);

  const refresh = useCallback(async () => {
    if (!hasSupabaseEnv()) {
      const reports: FieldAction[] = demoHotspots.slice(0, 5).map((h) => ({
        id: h.id,
        kind: "report" as const,
        title: h.pest_type,
        greenhouse: h.greenhouses?.name ?? "—",
        created_at: h.created_at,
      }));
      const scouts: FieldAction[] = demoScouting.slice(0, 5).map((r) => ({
        id: r.id,
        kind: "scout" as const,
        title: `${r.issue} (${r.rating ?? "—"}/5)`,
        greenhouse: r.greenhouseName,
        created_at: r.recordedAt,
      }));
      setItems(
        [...scouts, ...reports].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
      );
      setLoading(false);
      return;
    }

    try {
      const user = await getCurrentUser();
      if (!user) return;

      const [hotspotsRes, scoutingRes] = await Promise.all([
        listHotspots(10),
        listScoutingRecords(10),
      ]);

      if (hotspotsRes.error) throw hotspotsRes.error;
      if (scoutingRes.error) throw scoutingRes.error;

      const reports: FieldAction[] = (hotspotsRes.data ?? [])
        .filter((h) => (h as { reported_by: string }).reported_by === user.id)
        .map((h) => {
          const row = h as {
            id: string;
            pest_type: string;
            created_at: string;
            greenhouses?: { name?: string } | null;
          };
          return {
            id: row.id,
            kind: "report" as const,
            title: row.pest_type,
            greenhouse: row.greenhouses?.name ?? "—",
            created_at: row.created_at,
          };
        });

      const scouts: FieldAction[] = (scoutingRes.data ?? [])
        .filter((r) => (r as { scout_id: string }).scout_id === user.id)
        .map((r) => {
          const row = r as {
            id: string;
            issue_name: string;
            rating: number | null;
            recorded_at: string;
            greenhouses?: { name?: string } | null;
          };
          return {
            id: row.id,
            kind: "scout" as const,
            title: `${row.issue_name} (${row.rating ?? "—"}/5)`,
            greenhouse: row.greenhouses?.name ?? "—",
            created_at: row.recorded_at,
          };
        });

      setItems(
        [...scouts, ...reports]
          .sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          )
          .slice(0, 3),
      );
    } catch (e) {
      toast({
        title: "Unable to load history",
        description: e instanceof Error ? e.message : "Unknown error",
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, demoHotspots, demoScouting]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useRealtimeFieldFeed(refresh);

  return (
    <section className="space-y-4">
      <DashboardPageHeader
        eyebrow="Field worker"
        title="Today"
        description="Scout crops and report infestations in the greenhouse."
      />

      <Link
        href="/worker/field"
        className="dashboard-hero group block rounded-2xl p-5 transition hover:translate-y-[-1px]"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold">Go to field work</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Scan QR, record scouting stops, or report infestations.
            </p>
          </div>
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <QrCode className="size-6" />
          </span>
        </div>
      </Link>

      <WorkerLiveStatus />

      <div className="glass-card rounded-2xl p-4">
        <h2 className="text-sm font-semibold">Last 3 actions</h2>
        {loading ? (
          <div className="mt-3 space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : items.length ? (
          <ul className="mt-3 space-y-2">
            {items.map((item) => (
              <li
                key={`${item.kind}-${item.id}`}
                className="rounded-xl border border-border/70 bg-background/70 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge variant="outline">
                      {item.kind === "report" ? "Report" : "Scout"}
                    </Badge>
                    <p className="mt-2 text-sm font-semibold">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.greenhouse}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No actions yet. Start with field work.
          </p>
        )}
        <Link
          href="/worker/field"
          className={`${buttonVariants({ size: "sm", variant: "outline" })} mt-4 inline-flex`}
        >
          Open field work
        </Link>
      </div>
    </section>
  );
}
