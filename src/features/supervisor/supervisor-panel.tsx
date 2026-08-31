"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { listActivities, setActivityStatus } from "@/services/supabase/activity-service";
import { useRealtimeActivities } from "@/hooks/use-realtime-activities";
import { getEvidenceSignedUrl } from "@/services/supabase/storage-service";
import { hasSupabaseEnv } from "@/lib/supabase/config";

type Item = {
  id: string;
  activity_type: string;
  created_at: string;
  notes?: string | null;
  image_url?: string | null;
  users?: { full_name?: string } | null;
  farms?: { name?: string } | null;
  greenhouses?: { name?: string } | null;
};

export function SupervisorPanel() {
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!hasSupabaseEnv()) {
      setItems([
        {
          id: "demo-sub-1",
          activity_type: "Irrigation",
          created_at: new Date().toISOString(),
          notes: "Scouting stop submitted for STGH01A.",
          users: { full_name: "Ravi" },
          farms: { name: "Star" },
          greenhouses: { name: "STGH01A" },
          image_url: null,
        },
      ]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await listActivities({ status: "pending", limit: 30 });
      if (error) throw error;
      setItems((data as unknown as Item[]) ?? []);
    } catch (e) {
      toast({
        title: "Unable to load pending submissions",
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

  useRealtimeActivities(refresh);

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    if (!hasSupabaseEnv()) {
      toast({
        title: `Demo mode: ${status}`,
        description: "Connect Supabase to persist approval decisions.",
        tone: "success",
      });
      setItems((prev) => prev.filter((item) => item.id !== id));
      return;
    }

    try {
      setBusyId(id);
      const { error } = await setActivityStatus(id, status);
      if (error) throw error;
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

  return (
    <div className="space-y-3">
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length ? (
        <div className="grid gap-3">
          {items.map((item) => (
            <div key={item.id} className="glass-card rounded-xl p-4">
              <p className="text-sm">
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
      ) : (
        <div className="glass-card rounded-2xl p-5">
          <p className="text-sm text-muted-foreground">
            No pending submissions right now.
          </p>
        </div>
      )}
    </div>
  );
}

