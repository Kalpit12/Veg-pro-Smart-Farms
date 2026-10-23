"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { MapPin, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { kenyaNowIso } from "@/lib/kenya-time";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeHotspots } from "@/hooks/use-realtime-hotspots";
import { listActivities, setActivityStatus } from "@/services/supabase/activity-service";
import {
  listActiveHotspots,
  type HotspotRow,
} from "@/services/supabase/infestation-service";
import { getEvidenceSignedUrl } from "@/services/supabase/storage-service";
import { hasConfiguredBackend, isOfflineDemo } from "@/lib/data-backend";

type ActivityItem = {
  id: string;
  activity_type: string;
  created_at: string;
  notes?: string | null;
  image_url?: string | null;
  users?: { full_name?: string } | null;
  farms?: { name?: string } | null;
  greenhouses?: { name?: string } | null;
};

function asError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (error && typeof error === "object" && "message" in error) {
    return new Error(String((error as { message: unknown }).message));
  }
  return new Error(String(error));
}

export function SupervisorPanel({
  portalBase = "/manager",
}: {
  portalBase?: "/manager" | "/admin";
}) {
  const { toast } = useToast();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [hotspots, setHotspots] = useState<HotspotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (isOfflineDemo()) {
      setActivities([
        {
          id: "demo-sub-1",
          activity_type: "Irrigation",
          created_at: kenyaNowIso(),
          notes: "Scouting stop submitted for STGH01A.",
          users: { full_name: "Ravi" },
          farms: { name: "Star" },
          greenhouses: { name: "STGH01A" },
          image_url: null,
        },
      ]);
      setHotspots([]);
      setLoading(false);
      return;
    }

    try {
      const [actRes, hotRes] = await Promise.all([
        listActivities({ status: "pending", limit: 30 }),
        listActiveHotspots(30),
      ]);
      if (actRes.error) throw asError(actRes.error);
      if (hotRes.error) throw asError(hotRes.error);
      setActivities((actRes.data as unknown as ActivityItem[]) ?? []);
      setHotspots((hotRes.data as HotspotRow[]) ?? []);
    } catch (e) {
      toast({
        title: "Unable to load pending submissions",
        description: e instanceof Error ? e.message : "Unknown error",
        tone: "error",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useRealtimeHotspots(refresh);

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    if (isOfflineDemo()) {
      toast({
        title: `Demo mode: ${status}`,
        description: "Connect Supabase to persist approval decisions.",
        tone: "success",
      });
      setActivities((prev) => prev.filter((item) => item.id !== id));
      return;
    }

    try {
      setBusyId(id);
      const { error } = await setActivityStatus(id, status);
      if (error) throw asError(error);
      toast({ title: `Marked ${status}`, tone: "success" });
      await refresh();
    } catch (e) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : "Unknown error",
        tone: "error",
      });
    } finally {
      setBusyId(null);
    }
  };

  const empty = !activities.length && !hotspots.length;

  return (
    <div className="space-y-3">
      {hasConfiguredBackend() && !isOfflineDemo() ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={refreshing}
            onClick={() => {
              setRefreshing(true);
              void refresh();
            }}
          >
            <RefreshCw className={`mr-1.5 size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : empty ? (
        <div className="glass-card rounded-2xl p-5">
          <p className="text-sm text-muted-foreground">
            No pending submissions right now.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Worker pest reports appear here as active infestation reports. General
            activity forms (after QR scan) use the approve/reject queue below when
            submitted.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {hotspots.map((hotspot) => (
            <div key={hotspot.id} className="glass-card rounded-xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Badge variant="warning">Pest report</Badge>
                  <p className="mt-2 text-sm">
                    <span className="font-semibold">
                      {hotspot.users?.full_name ?? "Worker"}
                    </span>{" "}
                    reported{" "}
                    <span className="font-semibold">{hotspot.pest_type}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {hotspot.farms?.name ?? "Farm"}
                    {hotspot.greenhouses?.name ? ` / ${hotspot.greenhouses.name}` : ""}
                    {" · "}
                    severity {hotspot.severity}/5 ·{" "}
                    {formatDistanceToNow(new Date(hotspot.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                  {hotspot.main_issue ? (
                    <p className="mt-2 text-sm text-muted-foreground">{hotspot.main_issue}</p>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`${portalBase}/map`}
                  className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-xs font-medium hover:bg-muted/60"
                >
                  <MapPin className="mr-1 size-3.5" />
                  View on map
                </Link>
                <Link
                  href={`${portalBase}/spray`}
                  className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground"
                >
                  Log spray response
                </Link>
              </div>
            </div>
          ))}

          {activities.map((item) => (
            <div key={item.id} className="glass-card rounded-xl p-4">
              <Badge variant="outline">Activity submission</Badge>
              <p className="mt-2 text-sm">
                <span className="font-semibold">{item.users?.full_name ?? "Worker"}</span>{" "}
                submitted <span className="font-semibold">{item.activity_type}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.farms?.name ?? "Farm"}
                {item.greenhouses?.name ? ` / ${item.greenhouses.name}` : ""} •{" "}
                {new Date(item.created_at).toLocaleString()}
              </p>
              {item.notes ? (
                <p className="mt-2 text-sm text-muted-foreground">{item.notes}</p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                {item.image_url ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        const url = await getEvidenceSignedUrl(item.image_url!);
                        window.open(url, "_blank", "noopener,noreferrer");
                      } catch (e) {
                        toast({
                          title: "Cannot open evidence",
                          description: e instanceof Error ? e.message : "Unknown error",
                          tone: "error",
                        });
                      }
                    }}
                  >
                    View Evidence
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  disabled={busyId === item.id}
                  onClick={() => void setStatus(item.id, "approved")}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === item.id}
                  onClick={() => void setStatus(item.id, "rejected")}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
