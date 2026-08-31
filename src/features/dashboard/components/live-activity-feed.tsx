"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDemoRefresh } from "@/hooks/use-demo-refresh";
import { useRealtimeFieldFeed } from "@/hooks/use-realtime-field-feed";
import { useToast } from "@/hooks/use-toast";
import {
  getDemoActivityHistory,
  getDemoLiveActivities,
  type DemoLiveActivity,
} from "@/lib/demo-field-data";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import {
  listFieldFeed,
  type FieldFeedItem,
} from "@/services/supabase/field-feed-service";
import { useFieldOpsStore } from "@/store/field-ops-store";
import { useScoutingStore } from "@/store/scouting-store";
import { cn } from "@/lib/utils";

type FeedItem = DemoLiveActivity | FieldFeedItem;

function statusVariant(status: string) {
  if (status === "approved") return "success" as const;
  if (status === "rejected") return "danger" as const;
  return "warning" as const;
}

function initials(name?: string | null) {
  if (!name) return "WK";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function shortActivityType(type: string) {
  if (type.toLowerCase().includes("spray")) return "Spray";
  if (type.toLowerCase().includes("infestation") || type.toLowerCase().includes("report")) {
    return "Hotspot";
  }
  if (type.toLowerCase().includes("scout")) return "Scouting";
  return type;
}

function ActivityRow({ activity }: { activity: FeedItem }) {
  const showStatus = activity.status !== "approved";
  const location = [activity.farms?.name, activity.greenhouses?.name].filter(Boolean).join(" / ");

  return (
    <div className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
        {initials(activity.users?.full_name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold">
            {activity.users?.full_name ?? "Worker"}
          </p>
          {showStatus ? (
            <Badge variant={statusVariant(activity.status)}>{activity.status}</Badge>
          ) : null}
        </div>
        <p className="mt-1 text-sm">
          {shortActivityType(activity.activity_type)}
          {activity.problem ? ` · ${activity.problem}` : ""}
        </p>
        {location ? (
          <p className="mt-1 text-xs text-muted-foreground">{location}</p>
        ) : null}
        <p className="mt-1 text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

function ActivityList({ items }: { items: FeedItem[] }) {
  if (!items.length) {
    return (
      <p className="text-sm text-muted-foreground">No activity yet.</p>
    );
  }

  return (
    <ul className="min-h-0 max-h-[min(70vh,32rem)] space-y-2 overflow-y-auto pr-1">
      {items.map((activity) => (
        <li
          key={activity.id}
          className="rounded-xl border border-border/70 bg-background/70 p-3"
        >
          <ActivityRow activity={activity} />
        </li>
      ))}
    </ul>
  );
}

function ActivityFeedHeader({ variant }: { variant: "manager" | "admin" }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold">
        {variant === "manager" ? "Field updates" : "Recent activity"}
      </h3>
    </div>
  );
}

function ActivityFeedTabs({
  tab,
  setTab,
}: {
  tab: "live" | "history";
  setTab: (t: "live" | "history") => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-border/70 bg-muted/30 p-1">
      <button
        type="button"
        onClick={() => setTab("live")}
        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
          tab === "live"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Live
      </button>
      <button
        type="button"
        onClick={() => setTab("history")}
        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
          tab === "history"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        History
      </button>
    </div>
  );
}

export function LiveActivityFeed({
  variant = "admin",
  className,
}: {
  variant?: "manager" | "admin";
  className?: string;
}) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [historyItems, setHistoryItems] = useState<FeedItem[]>([]);
  const [tab, setTab] = useState<"live" | "history">("live");
  const [loading, setLoading] = useState(true);
  const liveLimit = variant === "manager" ? 5 : 8;
  const { toast } = useToast();
  const { tick } = useDemoRefresh();
  const demoHotspots = useFieldOpsStore((s) => s.demoHotspots);
  const demoSprays = useFieldOpsStore((s) => s.demoSprays);
  const demoScouting = useScoutingStore((s) => s.demoRecords);

  const refresh = useCallback(async () => {
    if (!hasSupabaseEnv()) {
      const fromStores: FeedItem[] = [
        ...demoSprays.map((s) => ({
          id: `spray-${s.id}`,
          activity_type: "Spray treatment",
          status: "approved",
          created_at: s.created_at,
          problem: s.product_name,
          users: s.users,
          farms: s.farms,
          greenhouses: s.greenhouses,
        })),
        ...demoHotspots.map((h) => ({
          id: `hotspot-${h.id}`,
          activity_type: "Infestation report",
          status: h.status === "active" ? "pending" : h.status,
          created_at: h.created_at,
          problem: `${h.pest_type}: ${h.main_issue}`,
          users: h.users,
          farms: h.farms,
          greenhouses: h.greenhouses,
        })),
        ...demoScouting.map((r) => ({
          id: `scout-${r.id}`,
          activity_type: "Scouting stop",
          status: "approved",
          created_at: r.recordedAt,
          problem: `${r.issueType}: ${r.issue} (${r.rating ?? "—"}/5)`,
          users: { full_name: r.scoutName },
          farms: { name: r.farmName },
          greenhouses: { name: r.greenhouseName },
        })),
        ...getDemoLiveActivities(),
      ].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setItems(fromStores.slice(0, liveLimit));
      setHistoryItems([
        ...fromStores.slice(liveLimit),
        ...getDemoActivityHistory(),
      ]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await listFieldFeed(24);
      if (error) throw error;
      const feed = data ?? [];
      setItems(feed.slice(0, liveLimit));
      setHistoryItems(feed.slice(liveLimit));
    } catch (e) {
      toast({
        title: "Unable to load activity feed",
        description: e instanceof Error ? e.message : "Unknown error",
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, demoHotspots, demoSprays, demoScouting, liveLimit]);

  useEffect(() => {
    void refresh();
  }, [refresh, tick]);

  useRealtimeFieldFeed(refresh);

  const displayItems = useMemo(() => {
    if (variant === "manager") return items;
    return tab === "live" ? items : historyItems;
  }, [variant, tab, items, historyItems]);

  const historyHref = variant === "manager" ? "/manager/history" : null;

  return (
    <div className={cn("glass-card flex flex-col rounded-2xl p-4", className)}>
      <ActivityFeedHeader variant={variant} />
      {variant === "admin" ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <ActivityFeedTabs tab={tab} setTab={setTab} />
          <span className="text-xs text-muted-foreground">
            {tab === "live" ? items.length : historyItems.length} items
          </span>
        </div>
      ) : null}

      {loading ? (
        <ActivityFeedLoading />
      ) : (
        <ActivityList items={displayItems} />
      )}

      {historyHref ? (
        <div className="mt-4 border-t border-border/70 pt-3">
          <Link
            href={historyHref}
            className="text-sm font-medium text-primary hover:underline"
          >
            View full history
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function ActivityFeedLoading() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
