"use client";

import { format, formatDistanceToNow } from "date-fns";
import { User } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AppSelect } from "@/components/ui/app-select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GreenhouseConditionPanel } from "@/features/infestation/greenhouse-condition-panel";
import { GreenhouseImprovementChart } from "@/features/infestation/greenhouse-improvement-chart";
import { useDemoRefresh } from "@/hooks/use-demo-refresh";
import { useRealtimeFieldFeed } from "@/hooks/use-realtime-field-feed";
import { useRealtimeHotspots } from "@/hooks/use-realtime-hotspots";
import { useRealtimePositions } from "@/hooks/use-realtime-positions";
import { useToast } from "@/hooks/use-toast";
import {
  getDemoGreenhouseCondition,
  getDemoGreenhouseOptions,
  getDemoHistory,
} from "@/lib/demo-field-data";
import {
  buildImprovementTrendFromCompare,
  computeGreenhouseCondition,
  computeImprovementTrend,
  type GreenhouseConditionCompare,
} from "@/lib/greenhouse-condition";
import { getHistorySinceDate, HISTORY_LOOKBACK_MONTHS } from "@/lib/history-range";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { listHotspotsForHistory } from "@/services/supabase/infestation-service";
import { listSpraysForHistory } from "@/services/supabase/spray-service";
import { useFieldOpsStore } from "@/store/field-ops-store";

type HistoryItem = {
  id: string;
  type: "report" | "spray";
  title: string;
  detail: string;
  farm: string;
  greenhouse: string;
  greenhouse_id: string;
  worker: string;
  created_at: string;
  severity?: number;
  status?: string;
};

type GreenhouseOption = {
  id: string;
  label: string;
};

function mapHotspotToHistory(row: {
  id: string;
  pest_type: string;
  problem: string;
  created_at: string;
  greenhouse_id: string | null;
  severity?: number;
  status?: string;
  farms?: { name?: string } | null;
  greenhouses?: { name?: string } | null;
  users?: { full_name?: string } | null;
}): HistoryItem {
  return {
    id: row.id,
    type: "report",
    title: row.pest_type,
    detail: row.problem,
    farm: row.farms?.name ?? "—",
    greenhouse: row.greenhouses?.name ?? "—",
    greenhouse_id: row.greenhouse_id ?? "",
    worker: row.users?.full_name ?? "—",
    created_at: row.created_at,
    severity: row.severity,
    status: row.status,
  };
}

function mapSprayToHistory(row: {
  id: string;
  product_name: string;
  notes: string | null;
  created_at: string;
  greenhouse_id: string | null;
  farms?: { name?: string } | null;
  greenhouses?: { name?: string } | null;
  users?: { full_name?: string } | null;
}): HistoryItem {
  return {
    id: row.id,
    type: "spray",
    title: row.product_name,
    detail: row.notes ?? "Spray treatment",
    farm: row.farms?.name ?? "—",
    greenhouse: row.greenhouses?.name ?? "—",
    greenhouse_id: row.greenhouse_id ?? "",
    worker: row.users?.full_name ?? "—",
    created_at: row.created_at,
  };
}

function formatWorkedAt(iso: string) {
  const d = new Date(iso);
  return format(d, "MMM d, yyyy · h:mm a");
}

export function HistoryList() {
  const { toast } = useToast();
  const { tick } = useDemoRefresh();
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type");
  const initialGreenhouse = searchParams.get("greenhouse") ?? "";
  const demoHotspots = useFieldOpsStore((s) => s.demoHotspots);
  const demoSprays = useFieldOpsStore((s) => s.demoSprays);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [greenhouseOptions, setGreenhouseOptions] = useState<GreenhouseOption[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"all" | "report" | "spray">(() => {
    if (initialType === "report" || initialType === "spray") return initialType;
    return "all";
  });
  const [greenhouseFilter, setGreenhouseFilter] = useState(initialGreenhouse);

  useEffect(() => {
    if (initialType === "report" || initialType === "spray") {
      setTypeFilter(initialType);
    }
  }, [initialType]);

  useEffect(() => {
    if (initialGreenhouse) setGreenhouseFilter(initialGreenhouse);
  }, [initialGreenhouse]);

  const since = useMemo(() => getHistorySinceDate(), []);

  const refresh = useCallback(async () => {
    const greenhouseId = greenhouseFilter || undefined;

    if (!hasSupabaseEnv()) {
      const options = getDemoGreenhouseOptions().map((g) => ({
        id: g.id,
        label: g.label,
      }));
      setGreenhouseOptions(options);

      const staticHistory = getDemoHistory(greenhouseId);
      const liveReports = demoHotspots.map((h) =>
        mapHotspotToHistory({
          id: h.id,
          pest_type: h.pest_type,
          problem: h.problem,
          created_at: h.created_at,
          greenhouse_id: h.greenhouse_id,
          severity: h.severity,
          status: h.status,
          farms: h.farms,
          greenhouses: h.greenhouses,
          users: h.users,
        }),
      );
      const liveSprays = demoSprays.map((s) =>
        mapSprayToHistory({
          id: s.id,
          product_name: s.product_name,
          notes: s.notes,
          created_at: s.created_at,
          greenhouse_id: s.greenhouse_id,
          farms: s.farms,
          greenhouses: s.greenhouses,
          users: s.users,
        }),
      );
      const merged = [...liveReports, ...liveSprays, ...staticHistory];
      const seen = new Set<string>();
      const deduped = merged.filter((item) => {
        const key = `${item.type}-${item.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setItems(deduped);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [hotspotsRes, spraysRes] = await Promise.all([
        listHotspotsForHistory({ greenhouseId, since, limit: 500 }),
        listSpraysForHistory({ greenhouseId, since, limit: 500 }),
      ]);
      if (hotspotsRes.error) throw hotspotsRes.error;
      if (spraysRes.error) throw spraysRes.error;

      const reports = (hotspotsRes.data ?? []).map((h) =>
        mapHotspotToHistory(h as Parameters<typeof mapHotspotToHistory>[0]),
      );
      const sprays = (spraysRes.data ?? []).map((s) =>
        mapSprayToHistory(s as Parameters<typeof mapSprayToHistory>[0]),
      );
      const merged = [...reports, ...sprays].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      setItems(merged);

      setGreenhouseOptions((prev) => {
        const optionMap = new Map(prev.map((o) => [o.id, o.label]));
        for (const item of merged) {
          if (item.greenhouse_id && item.greenhouse !== "—") {
            optionMap.set(
              item.greenhouse_id,
              `${item.farm} / ${item.greenhouse}`,
            );
          }
        }
        return Array.from(optionMap.entries())
          .map(([id, label]) => ({ id, label }))
          .sort((a, b) => a.label.localeCompare(b.label));
      });
    } catch (e) {
      toast({
        title: "History unavailable",
        description: e instanceof Error ? e.message : "Unknown error",
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [greenhouseFilter, since, toast, demoHotspots, demoSprays]);

  useEffect(() => {
    void refresh();
  }, [refresh, tick]);

  useEffect(() => {
    if (greenhouseFilter || !greenhouseOptions.length) return;
    setGreenhouseFilter(greenhouseOptions[0].id);
  }, [greenhouseOptions, greenhouseFilter]);

  useRealtimeHotspots(refresh);
  useRealtimeFieldFeed(refresh);
  useRealtimePositions(refresh);

  const filtered = useMemo(() => {
    let result = items.filter((i) => new Date(i.created_at) >= since);
    if (typeFilter !== "all") {
      result = result.filter((i) => i.type === typeFilter);
    }
    return result;
  }, [items, typeFilter, since]);

  const conditionCompare = useMemo((): GreenhouseConditionCompare | null => {
    if (!greenhouseFilter) return null;

    if (!hasSupabaseEnv()) {
      return getDemoGreenhouseCondition(greenhouseFilter);
    }

    return computeGreenhouseCondition(items, greenhouseFilter);
  }, [greenhouseFilter, items]);

  const improvementTrend = useMemo(() => {
    if (!conditionCompare || !greenhouseFilter) return [];

    if (!hasSupabaseEnv()) {
      return buildImprovementTrendFromCompare(conditionCompare);
    }

    return computeImprovementTrend(items, greenhouseFilter, conditionCompare);
  }, [conditionCompare, greenhouseFilter, items]);

  const selectedGreenhouseLabel = useMemo(() => {
    return (
      greenhouseOptions.find((g) => g.id === greenhouseFilter)?.label ??
      "Select a greenhouse"
    );
  }, [greenhouseFilter, greenhouseOptions]);

  if (loading) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="block min-w-[14rem] flex-1 text-sm font-medium sm:max-w-md">
          Greenhouse
          <AppSelect
            aria-label="Greenhouse"
            className="mt-1.5"
            align="start"
            value={greenhouseFilter}
            onChange={setGreenhouseFilter}
            placeholder="Choose greenhouse…"
            options={greenhouseOptions.map((g) => ({ value: g.id, label: g.label }))}
          />
        </label>

        <label className="block min-w-[10rem] text-sm font-medium sm:max-w-xs">
          Type
          <AppSelect
            aria-label="History type"
            className="mt-1.5"
            align="start"
            value={typeFilter}
            onChange={(next) => setTypeFilter(next as typeof typeFilter)}
            options={[
              { value: "all", label: "All" },
              { value: "report", label: "Reports only" },
              { value: "spray", label: "Sprays only" },
            ]}
          />
        </label>
      </div>

      {conditionCompare && improvementTrend.length ? (
        <GreenhouseImprovementChart
          compare={conditionCompare}
          trend={improvementTrend}
        />
      ) : null}

      {conditionCompare ? <GreenhouseConditionPanel compare={conditionCompare} /> : null}

      <h2 className="text-sm font-semibold">Activity timeline</h2>
      <p className="text-xs text-muted-foreground">
        {selectedGreenhouseLabel} · Last {HISTORY_LOOKBACK_MONTHS} months (
        {format(since, "MMM d, yyyy")} – {format(new Date(), "MMM d, yyyy")}) ·{" "}
        {filtered.length} record{filtered.length === 1 ? "" : "s"}
      </p>

      <ul className="space-y-2">
        {filtered.map((item) => (
          <li
            key={`${item.type}-${item.id}`}
            className="glass-card rounded-xl p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {item.type === "report" ? "Hotspot" : "Spray"}
                  </p>
                  {item.type === "report" && item.severity ? (
                    <Badge variant={item.severity >= 4 ? "danger" : "warning"}>
                      Severity {item.severity}/5
                    </Badge>
                  ) : null}
                  {item.status && item.status !== "active" ? (
                    <Badge variant="outline">{item.status}</Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-base font-semibold">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {item.farm} / {item.greenhouse}
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-sm">
                  <User className="size-3.5 shrink-0 text-primary" />
                  <span>
                    <span className="font-medium">{item.worker}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · worked on {formatWorkedAt(item.created_at)}
                    </span>
                  </span>
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(item.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {!filtered.length ? (
        <p className="text-sm text-muted-foreground">
          No reports or sprays for this greenhouse in the last{" "}
          {HISTORY_LOOKBACK_MONTHS} months.
        </p>
      ) : null}
    </section>
  );
}
