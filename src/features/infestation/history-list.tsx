"use client";

import { format, formatDistanceToNow, subDays } from "date-fns";
import { User } from "lucide-react";
import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

import { AppSelect } from "@/components/ui/app-select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getMyAssignedSitesAction,
  listFarmsGreenhousesCatalogAction,
} from "@/features/admin/supervisor-access-actions";
import { GreenhouseConditionPanel } from "@/features/infestation/greenhouse-condition-panel";
import { GreenhouseImprovementChart } from "@/features/infestation/greenhouse-improvement-chart";
import { useDemoRefresh } from "@/hooks/use-demo-refresh";
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
import { hasConfiguredBackend, isOfflineDemo } from "@/lib/data-backend";
import { ALL } from "@/lib/manager-dashboard-filters";
import type { FarmGreenhouseCatalogItem } from "@/services/supervisor-access-service";
import { listHotspotsForHistory } from "@/services/supabase/infestation-service";
import { listSpraysForHistory } from "@/services/supabase/spray-service";
import { useFieldOpsStore } from "@/store/field-ops-store";

const RANGE_OPTIONS = [
  { value: 7, label: "Last 7 days" },
  { value: 14, label: "Last 14 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
] as const;

type RangeDays = (typeof RANGE_OPTIONS)[number]["value"];

type HistoryItem = {
  id: string;
  type: "report" | "spray";
  title: string;
  detail: string;
  farm: string;
  greenhouse: string;
  greenhouse_id: string;
  variety: string;
  worker: string;
  created_at: string;
  severity?: number;
  status?: string;
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
  greenhouses?: { name?: string; crop_type?: string } | null;
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
    variety: row.greenhouses?.crop_type ?? "—",
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
  severity_before?: number | null;
  severity_after?: number | null;
  farms?: { name?: string } | null;
  greenhouses?: { name?: string; crop_type?: string } | null;
  users?: { full_name?: string } | null;
}): HistoryItem {
  const evaluate =
    row.severity_before != null && row.severity_after != null
      ? `Evaluate ${row.severity_before}→${row.severity_after}/5`
      : null;
  const detailParts = [evaluate, row.notes].filter(Boolean);
  return {
    id: row.id,
    type: "spray",
    title: row.product_name,
    detail: detailParts.length ? detailParts.join(" · ") : "Spray treatment",
    farm: row.farms?.name ?? "—",
    greenhouse: row.greenhouses?.name ?? "—",
    greenhouse_id: row.greenhouse_id ?? "",
    variety: row.greenhouses?.crop_type ?? "—",
    worker: row.users?.full_name ?? "—",
    created_at: row.created_at,
    severity: row.severity_after ?? row.severity_before ?? undefined,
  };
}

function formatWorkedAt(iso: string) {
  const d = new Date(iso);
  return format(d, "MMM d, yyyy · h:mm a");
}

function greenhousesForFarmCatalog(
  sites: FarmGreenhouseCatalogItem[],
  farmId: string,
) {
  if (farmId === ALL) return sites.flatMap((f) => f.greenhouses);
  return sites.find((f) => f.farmId === farmId)?.greenhouses ?? [];
}

function varietiesForCatalog(
  sites: FarmGreenhouseCatalogItem[],
  farmId: string,
  greenhouseId: string,
) {
  const ghs = greenhousesForFarmCatalog(sites, farmId);
  const pool =
    greenhouseId === ALL ? ghs : ghs.filter((g) => g.id === greenhouseId);
  const set = new Set<string>();
  for (const g of pool) {
    const v = g.cropType?.trim();
    if (v) set.add(v);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

type Props = {
  scope?: "admin" | "manager";
  fullReportRef?: RefObject<HTMLDivElement | null>;
};

export function HistoryList({ scope = "admin", fullReportRef }: Props) {
  const { toast } = useToast();
  const { tick } = useDemoRefresh();
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type");
  const initialGreenhouse = searchParams.get("greenhouse") ?? "";
  const demoHotspots = useFieldOpsStore((s) => s.demoHotspots);
  const demoSprays = useFieldOpsStore((s) => s.demoSprays);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [sites, setSites] = useState<FarmGreenhouseCatalogItem[]>([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [loading, setLoading] = useState(true);
  const initialLoadDone = useRef(false);

  const [rangeDays, setRangeDays] = useState<RangeDays>(90);
  const [farmId, setFarmId] = useState(ALL);
  const [greenhouseId, setGreenhouseId] = useState(
    initialGreenhouse || ALL,
  );
  const [variety, setVariety] = useState(ALL);
  const [typeFilter, setTypeFilter] = useState<"all" | "report" | "spray">(() => {
    if (initialType === "report" || initialType === "spray") return initialType;
    return "all";
  });

  const since = useMemo(
    () => subDays(new Date(), rangeDays),
    [rangeDays],
  );

  const assignedGhIds = useMemo(() => {
    if (scope !== "manager") return null;
    return new Set(sites.flatMap((f) => f.greenhouses.map((g) => g.id)));
  }, [scope, sites]);

  useEffect(() => {
    if (initialType === "report" || initialType === "spray") {
      setTypeFilter(initialType);
    }
  }, [initialType]);

  useEffect(() => {
    if (initialGreenhouse) setGreenhouseId(initialGreenhouse);
  }, [initialGreenhouse]);

  useEffect(() => {
    let cancelled = false;
    setLoadingSites(true);
    void (scope === "admin"
      ? listFarmsGreenhousesCatalogAction()
      : getMyAssignedSitesAction()
    ).then((result) => {
      if (cancelled) return;
      setSites(result.data ?? []);
      setLoadingSites(false);
    });
    return () => {
      cancelled = true;
    };
  }, [scope]);

  const refresh = useCallback(async () => {
    if (isOfflineDemo()) {
      const options = getDemoGreenhouseOptions();
      setSites([
        {
          farmId: "demo",
          farmName: "Demo farm",
          greenhouses: options.map((g) => ({
            id: g.id,
            name: g.label.split(" / ").pop() ?? g.label,
            cropType: "Athena",
          })),
        },
      ]);

      const staticHistory = getDemoHistory(undefined);
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
      initialLoadDone.current = true;
      return;
    }

    try {
      if (!initialLoadDone.current) setLoading(true);
      const [hotspotsRes, spraysRes] = await Promise.all([
        listHotspotsForHistory({ since, limit: 2000 }),
        listSpraysForHistory({ since, limit: 2000 }),
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
    } catch (e) {
      toast({
        title: "History unavailable",
        description: e instanceof Error ? e.message : "Unknown error",
        tone: "error",
      });
    } finally {
      setLoading(false);
      initialLoadDone.current = true;
    }
  }, [since, toast, demoHotspots, demoSprays]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!isOfflineDemo()) return;
    void refresh();
  }, [tick, refresh]);

  const scopeFilteredItems = useMemo(() => {
    if (!assignedGhIds) return items;
    return items.filter(
      (i) => i.greenhouse_id && assignedGhIds.has(i.greenhouse_id),
    );
  }, [items, assignedGhIds]);

  const filtered = useMemo(() => {
    let result = scopeFilteredItems.filter(
      (i) => new Date(i.created_at) >= since,
    );
    if (typeFilter !== "all") {
      result = result.filter((i) => i.type === typeFilter);
    }
    if (farmId !== ALL) {
      const farm = sites.find((f) => f.farmId === farmId);
      const farmName = farm?.farmName;
      if (farmName) result = result.filter((i) => i.farm === farmName);
    }
    if (greenhouseId !== ALL) {
      result = result.filter((i) => i.greenhouse_id === greenhouseId);
    }
    if (variety !== ALL) {
      result = result.filter((i) => i.variety === variety);
    }
    return result;
  }, [
    scopeFilteredItems,
    since,
    typeFilter,
    farmId,
    greenhouseId,
    variety,
    sites,
  ]);

  const chartContext = useMemo(() => {
    if (greenhouseId !== ALL) {
      const meta = greenhousesForFarmCatalog(sites, farmId).find(
        (g) => g.id === greenhouseId,
      );
      return {
        id: greenhouseId,
        name: meta?.name ?? null,
        autoSelected: false,
      };
    }

    const counts = new Map<
      string,
      { id: string; name: string; count: number }
    >();
    for (const item of filtered) {
      let id = item.greenhouse_id;
      const name = item.greenhouse;
      if (!id && name && name !== "—") {
        for (const farm of sites) {
          const gh = farm.greenhouses.find((g) => g.name === name);
          if (gh) {
            id = gh.id;
            break;
          }
        }
      }
      const key = id || name;
      if (!key || key === "—") continue;
      const prev = counts.get(key) ?? {
        id: id || key,
        name: name !== "—" ? name : key,
        count: 0,
      };
      prev.count += 1;
      counts.set(key, prev);
    }

    let best: { id: string; name: string; count: number } | null = null;
    for (const entry of counts.values()) {
      if (!best || entry.count > best.count) best = entry;
    }

    if (!best) {
      return { id: "", name: null as string | null, autoSelected: false };
    }

    return {
      id: best.id,
      name: best.name,
      autoSelected: true,
    };
  }, [greenhouseId, filtered, sites, farmId]);

  const conditionCompare = useMemo((): GreenhouseConditionCompare | null => {
    if (!chartContext.id && !chartContext.name) return null;

    if (isOfflineDemo()) {
      return getDemoGreenhouseCondition(chartContext.id);
    }

    return computeGreenhouseCondition(
      scopeFilteredItems,
      chartContext.id,
      chartContext.name,
    );
  }, [chartContext, scopeFilteredItems]);

  const improvementTrend = useMemo(() => {
    if (!conditionCompare || (!chartContext.id && !chartContext.name)) return [];

    if (isOfflineDemo()) {
      return buildImprovementTrendFromCompare(conditionCompare);
    }

    return computeImprovementTrend(
      scopeFilteredItems,
      chartContext.id,
      conditionCompare,
      since,
      chartContext.name,
    );
  }, [conditionCompare, chartContext, scopeFilteredItems, since]);

  const farmOptions = useMemo(
    () => [
      { value: ALL, label: "All farms" },
      ...sites.map((f) => ({ value: f.farmId, label: f.farmName })),
    ],
    [sites],
  );

  const greenhouseOptions = useMemo(
    () => [
      { value: ALL, label: "All sites" },
      ...greenhousesForFarmCatalog(sites, farmId)
        .filter((g) => variety === ALL || g.cropType === variety)
        .map((g) => ({ value: g.id, label: g.name })),
    ],
    [sites, farmId, variety],
  );

  const varietyOptions = useMemo(
    () => [
      { value: ALL, label: "All varieties" },
      ...varietiesForCatalog(sites, farmId, greenhouseId).map((v) => ({
        value: v,
        label: v,
      })),
    ],
    [sites, farmId, greenhouseId],
  );

  const groupedForFullReport = useMemo(() => {
    const byGh = new Map<string, HistoryItem[]>();
    for (const item of scopeFilteredItems.filter(
      (i) => new Date(i.created_at) >= since,
    )) {
      const key = item.greenhouse_id || item.greenhouse;
      const list = byGh.get(key) ?? [];
      list.push(item);
      byGh.set(key, list);
    }
    return [...byGh.entries()].sort((a, b) => {
      const la = a[1][0]?.greenhouse ?? "";
      const lb = b[1][0]?.greenhouse ?? "";
      return la.localeCompare(lb);
    });
  }, [scopeFilteredItems, since]);

  if (loading && !initialLoadDone.current) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <FilterField label="Range">
          <AppSelect
            aria-label="History range"
            value={String(rangeDays)}
            onChange={(v) => setRangeDays(Number(v) as RangeDays)}
            options={RANGE_OPTIONS.map((o) => ({
              value: String(o.value),
              label: o.label,
            }))}
          />
        </FilterField>
        <FilterField label="Farm">
          <AppSelect
            aria-label="Farm"
            value={farmId}
            onChange={setFarmId}
            disabled={loadingSites}
            options={
              farmOptions.length
                ? farmOptions
                : [{ value: ALL, label: "Loading…" }]
            }
          />
        </FilterField>
        <FilterField label="Site">
          <AppSelect
            aria-label="Greenhouse site"
            value={greenhouseId}
            onChange={setGreenhouseId}
            disabled={loadingSites}
            options={greenhouseOptions}
          />
        </FilterField>
        <FilterField label="Variety">
          <AppSelect
            aria-label="Variety"
            value={variety}
            onChange={setVariety}
            disabled={loadingSites}
            options={varietyOptions}
          />
        </FilterField>
        <FilterField label="Type">
          <AppSelect
            aria-label="History type"
            value={typeFilter}
            onChange={(next) => setTypeFilter(next as typeof typeFilter)}
            options={[
              { value: "all", label: "All" },
              { value: "report", label: "Reports only" },
              { value: "spray", label: "Sprays only" },
            ]}
          />
        </FilterField>
      </div>

      {conditionCompare && improvementTrend.length ? (
        <div className="space-y-1">
          {chartContext.autoSelected ? (
            <p className="text-xs text-muted-foreground">
              Improvement chart for{" "}
              <span className="font-medium text-foreground">
                {conditionCompare.farm} / {conditionCompare.greenhouse}
              </span>{" "}
              (most activity in current filters). Pick a site to focus one greenhouse.
            </p>
          ) : null}
          <GreenhouseImprovementChart
            compare={conditionCompare}
            trend={improvementTrend}
          />
        </div>
      ) : null}

      {conditionCompare ? (
        <GreenhouseConditionPanel compare={conditionCompare} />
      ) : null}

      <h2 className="text-sm font-semibold">Activity timeline</h2>
      <p className="text-xs text-muted-foreground">
        {format(since, "MMM d, yyyy")} – {format(new Date(), "MMM d, yyyy")} ·{" "}
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
                  {item.variety && item.variety !== "—" ? ` · ${item.variety}` : ""}
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
          No reports or sprays match these filters for the selected range.
        </p>
      ) : null}

      {fullReportRef ? (
        <div
          ref={fullReportRef}
          aria-hidden
          className="pointer-events-none fixed top-0 left-[-10000px] z-[-1] w-[820px] space-y-6 bg-white p-6 text-black"
        >
          <header>
            <h1 className="text-2xl font-bold">VegPro full history report</h1>
            <p className="text-sm text-neutral-600">
              {format(since, "MMMM d, yyyy")} – {format(new Date(), "MMMM d, yyyy")}{" "}
              · all greenhouses · {scopeFilteredItems.length} total events
            </p>
          </header>
          {groupedForFullReport.map(([ghKey, ghItems]) => {
            const sample = ghItems[0]!;
            return (
              <section key={ghKey} className="break-inside-avoid space-y-2">
                <h2 className="border-b border-neutral-200 pb-1 text-lg font-semibold">
                  {sample.farm} / {sample.greenhouse}
                  {sample.variety && sample.variety !== "—"
                    ? ` · ${sample.variety}`
                    : ""}
                </h2>
                <ul className="space-y-2 text-sm">
                  {ghItems.map((item) => (
                    <li key={`${item.type}-${item.id}`} className="rounded border p-2">
                      <p className="font-medium">
                        {item.type === "report" ? "Report" : "Spray"}: {item.title}
                      </p>
                      <p className="text-neutral-700">{item.detail}</p>
                      <p className="text-neutral-500">
                        {item.worker} · {formatWorkedAt(item.created_at)}
                        {item.severity != null ? ` · severity ${item.severity}/5` : ""}
                        {item.status ? ` · ${item.status}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-[9rem] flex-1 text-sm font-medium sm:max-w-xs">
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
