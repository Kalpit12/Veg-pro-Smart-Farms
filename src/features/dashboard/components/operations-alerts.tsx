"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDemoRefresh } from "@/hooks/use-demo-refresh";
import { useRealtimeFieldFeed } from "@/hooks/use-realtime-field-feed";
import { useToast } from "@/hooks/use-toast";
import { getDemoAlerts } from "@/lib/demo-field-data";
import { hasConfiguredBackend, isOfflineDemo } from "@/lib/data-backend";
import {
  listFieldFeed,
  type FieldFeedItem,
} from "@/services/supabase/field-feed-service";
import { useFieldOpsStore } from "@/store/field-ops-store";
import { useScoutingStore } from "@/store/scouting-store";

type AlertItem = {
  id: string;
  type: string;
  message: string;
  created_at: string;
};

const HIDDEN_ALERT_TYPES = new Set(["worker_logout", "worker_login", "login", "logout"]);

const FIELD_ALERT_TYPES = new Set([
  "Scouting stop",
  "Infestation report",
  "scouting stop",
  "infestation report",
]);

function isFieldWorkerLog(item: FieldFeedItem) {
  const t = item.activity_type.toLowerCase();
  if (t.includes("scout")) return true;
  if (t.includes("infestation") || t.includes("report")) return true;
  if (t.includes("pest") || t.includes("disease")) return true;
  return FIELD_ALERT_TYPES.has(item.activity_type);
}

function feedItemToAlert(item: FieldFeedItem): AlertItem {
  const type = item.activity_type.toLowerCase().includes("scout")
    ? "scouting_log"
    : "field_report";
  const who = item.users?.full_name ?? "Worker";
  const where = [item.farms?.name, item.greenhouses?.name].filter(Boolean).join(" / ");
  const message = [who, item.problem, where].filter(Boolean).join(" · ");
  return {
    id: item.id,
    type,
    message,
    created_at: item.created_at,
  };
}

function filterLegacyAlerts(alerts: AlertItem[]) {
  return alerts.filter((alert) => !HIDDEN_ALERT_TYPES.has(alert.type));
}

function formatAlertType(type: string) {
  if (type === "scouting_log") return "Scouting log";
  if (type === "field_report") return "Field report";
  if (type === "infestation") return "Field report";
  return type.replaceAll("_", " ");
}

export function OperationsAlerts({
  audience = "admin",
  liveUpdates = true,
  managerDashboardFilters: _managerDashboardFilters = false,
}: {
  audience?: "manager" | "admin";
  liveUpdates?: boolean;
  managerDashboardFilters?: boolean;
}) {
  const { toast } = useToast();
  const { tick } = useDemoRefresh();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const demoHotspots = useFieldOpsStore((s) => s.demoHotspots);
  const demoScouting = useScoutingStore((s) => s.demoRecords);

  const refresh = useCallback(async () => {
    const limit = audience === "manager" ? 5 : 8;

    if (isOfflineDemo()) {
      const fromFeed: AlertItem[] = [
        ...demoScouting.slice(0, 4).map((r) => ({
          id: `scout-${r.id}`,
          type: "scouting_log",
          message: `${r.scoutName} · ${r.issueType}: ${r.issue} (${r.rating ?? "—"}/5) · ${r.greenhouseName}`,
          created_at: r.recordedAt,
        })),
        ...demoHotspots
          .filter((h) => h.status === "active")
          .slice(0, 3)
          .map((h) => ({
            id: `hotspot-${h.id}`,
            type: "field_report",
            message: `${h.users?.full_name ?? "Worker"} · ${h.pest_type}: ${h.main_issue} · ${h.greenhouses?.name ?? "—"}`,
            created_at: h.created_at,
          })),
        ...filterLegacyAlerts(getDemoAlerts()),
      ].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setAlerts(fromFeed.slice(0, limit));
      setLoading(false);
      return;
    }

    if (!hasConfiguredBackend()) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await listFieldFeed(30);
      if (error) throw error;
      const fieldAlerts = (data ?? [])
        .filter(isFieldWorkerLog)
        .map(feedItemToAlert)
        .slice(0, limit);
      setAlerts(fieldAlerts);
    } catch (e) {
      toast({
        title: "Alerts unavailable",
        description: e instanceof Error ? e.message : "Unknown error",
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, audience, demoHotspots, demoScouting]);

  useEffect(() => {
    void refresh();
  }, [refresh, tick]);

  useRealtimeFieldFeed(refresh, { enabled: liveUpdates });

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
        <p className="mt-1 text-xs text-muted-foreground">
          No new scouting logs or field reports from workers.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-destructive" />
          <h2 className="text-sm font-semibold">
            {audience === "manager" ? "Field reports" : "Worker field logs"}
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
              <p className="font-medium">{formatAlertType(alert.type)}</p>
              <span className="text-xs text-muted-foreground">
                {new Date(alert.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className="mt-1 text-muted-foreground">{alert.message}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
