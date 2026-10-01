"use client";

import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { MapPin, Sprout } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtimeFieldFeed } from "@/hooks/use-realtime-field-feed";
import { useToast } from "@/hooks/use-toast";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { useFieldOpsStore } from "@/store/field-ops-store";
import { useFieldWriteQueueStore } from "@/store/field-write-queue-store";
import { useScanStore } from "@/store/scan-store";
import {
  isScoutingWalkEngaged,
  useScoutingSessionStore,
} from "@/store/scouting-session-store";
import { pendingWalkFromSession } from "@/lib/scouting-walk-pending";
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

function firstNameFromUser(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
} | null) {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  const raw =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    (typeof meta.first_name === "string" && meta.first_name) ||
    "";
  const name = raw.trim().split(/\s+/)[0];
  if (name) return name;
  const email = user.email?.split("@")[0];
  return email || null;
}

export function WorkerDashboard() {
  const { toast } = useToast();
  const [items, setItems] = useState<FieldAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [workerName, setWorkerName] = useState<string | null>(null);

  const demoHotspots = useFieldOpsStore((s) => s.demoHotspots);
  const demoScouting = useScoutingStore((s) => s.demoRecords);
  const demoRoundId = useScoutingStore((s) => s.activeRoundId);
  const demoRounds = useScoutingStore((s) => s.demoRounds);
  const session = useScoutingSessionStore((s) => s.session);
  const walkEngaged = useScoutingSessionStore((s) => s.walkEngaged);
  const scan = useScanStore();
  const queuedWrites = useFieldWriteQueueStore((s) => s.items);

  const walkActive = isScoutingWalkEngaged(
    walkEngaged,
    session,
    demoRoundId,
    hasSupabaseEnv(),
  );
  const pendingWalk = !walkEngaged ? pendingWalkFromSession(session) : null;
  const walkGreenhouse =
    session?.greenhouseName ??
    demoRounds.find((r) => r.id === demoRoundId && r.status === "active")
      ?.greenhouseName ??
    scan.greenhouseName ??
    null;
  const walkStopCount = session?.stopCount ??
    demoRounds.find((r) => r.id === demoRoundId && r.status === "active")?.stopCount ??
    0;
  const currentGreenhouse = scan.greenhouseName
    ? `${scan.farmName ? `${scan.farmName} / ` : ""}${scan.greenhouseName}`
    : null;
  const pendingSync = queuedWrites.length;

  const refresh = useCallback(async () => {
    if (!hasSupabaseEnv()) {
      setWorkerName("Worker");
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
        title: r.issue,
        greenhouse: r.greenhouseName,
        created_at: r.recordedAt,
      }));
      setItems(
        [...scouts, ...reports]
          .sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          )
          .slice(0, 3),
      );
      setLoading(false);
      return;
    }

    try {
      const user = await getCurrentUser();
      if (!user) return;
      setWorkerName(firstNameFromUser(user));

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
            recorded_at: string;
            greenhouses?: { name?: string } | null;
          };
          return {
            id: row.id,
            kind: "scout" as const,
            title: row.issue_name,
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
      <div className="glass-card rounded-2xl p-5">
        <h1 className="text-2xl font-semibold">
          {workerName ? `Hi, ${workerName}` : "Today"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Check your greenhouse and log what you find.
        </p>
        {currentGreenhouse ? (
          <p className="mt-3 flex items-center gap-1.5 text-sm font-medium">
            <MapPin className="size-3.5 shrink-0 text-primary" />
            {currentGreenhouse}
          </p>
        ) : null}
      </div>

      {pendingWalk ? (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
          Unfinished walk in <span className="font-medium">{pendingWalk.greenhouseName}</span>
          {pendingWalk.stopCount > 0 ? ` · ${pendingWalk.stopCount} logs` : ""}. Open{" "}
          <Link href="/worker/field" className="font-medium underline">
            Field work
          </Link>{" "}
          to resume or discard.
        </p>
      ) : null}

      {pendingSync > 0 ? (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
          {pendingSync} {pendingSync === 1 ? "log" : "logs"} will upload when you are
          online.
        </p>
      ) : null}

      <Link
        href="/worker/field"
        className="dashboard-hero group flex min-h-20 items-center justify-between gap-3 rounded-2xl p-5 transition hover:translate-y-[-1px]"
      >
        <div>
          <p className="text-lg font-semibold">
            {walkActive ? "Continue walking" : "Start field work"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {walkActive
              ? `${walkGreenhouse ?? "Greenhouse"}${walkStopCount ? ` · ${walkStopCount} logs` : ""}`
              : "Check greenhouse · Log pests"}
          </p>
        </div>
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <Sprout className="size-6" />
        </span>
      </Link>

      <div className="glass-card rounded-2xl p-4">
        <h2 className="text-sm font-semibold">Recent</h2>
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
                      {item.kind === "report" ? "Pest report" : "Crop check"}
                    </Badge>
                    <p className="mt-2 text-sm font-semibold">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.greenhouse}</p>
                  </div>
                  <p className="shrink-0 text-xs text-muted-foreground">
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
            Nothing logged yet. Tap Start field work.
          </p>
        )}
      </div>
    </section>
  );
}
