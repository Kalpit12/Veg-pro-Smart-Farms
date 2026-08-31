"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtimeAlerts } from "@/hooks/use-realtime-alerts";
import { useToast } from "@/hooks/use-toast";
import { getDemoAlerts } from "@/lib/demo-field-data";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { listOpenAlerts } from "@/services/supabase/alert-service";
import { useFieldOpsStore } from "@/store/field-ops-store";

type AlertItem = {
  id: string;
  type: string;
  message: string;
  created_at: string;
};

const MANAGER_HIDDEN_ALERT_TYPES = new Set(["worker_logout"]);

function filterAlertsForAudience(alerts: AlertItem[], audience: "manager" | "admin") {
  const filtered =
    audience === "manager"
      ? alerts.filter((alert) => !MANAGER_HIDDEN_ALERT_TYPES.has(alert.type))
      : alerts;

  return audience === "manager" ? filtered.slice(0, 3) : filtered;
}

function formatAlertMessage(message: string, audience: "manager" | "admin") {
  if (audience === "admin") return message;
  return message.replace(/\s*\(GPS:[^)]+\)/gi, "").trim();
}

export function OperationsAlerts({
  audience = "admin",
}: {
  audience?: "manager" | "admin";
}) {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const demoAlerts = useFieldOpsStore((s) => s.demoAlerts);

  const refresh = useCallback(async () => {
    if (!hasSupabaseEnv()) {
      const merged = filterAlertsForAudience(
        [...demoAlerts, ...getDemoAlerts()].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
        audience,
      );
      setAlerts(merged);
      setLoading(false);
      return;
    }

    try {
      const limit = audience === "manager" ? 3 : 5;
      const { data, error } = await listOpenAlerts(limit);
      if (error) throw error;
      setAlerts(filterAlertsForAudience((data as AlertItem[]) ?? [], audience));
    } catch (e) {
      toast({
        title: "Alerts unavailable",
        description: e instanceof Error ? e.message : "Unknown error",
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, demoAlerts, audience]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useRealtimeAlerts(refresh);

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-3 h-14 w-full" />
      </div>
    );
  }

  if (!alerts.length) {
    return (
      <div className="glass-card rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">All clear</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-destructive" />
          <h2 className="text-sm font-semibold">
            {audience === "manager" ? "Needs your attention" : "Alerts"}
          </h2>
        </div>
        <Badge variant="danger">{alerts.length}</Badge>
      </div>
      <ul className="space-y-2">
        {alerts.map((alert) => (
          <li
            key={alert.id}
            className="rounded-xl border border-border/70 bg-background/70 p-3 text-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium capitalize">{alert.type.replaceAll("_", " ")}</p>
              <span className="text-xs text-muted-foreground">
                {new Date(alert.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className="mt-1 text-muted-foreground">
              {formatAlertMessage(alert.message, audience)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
