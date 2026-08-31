"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { MapPin, X } from "lucide-react";

import { AppSelect } from "@/components/ui/app-select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useRealtimeHotspots } from "@/hooks/use-realtime-hotspots";
import { useRealtimePositions } from "@/hooks/use-realtime-positions";
import { useRealtimePostgres } from "@/hooks/use-realtime-postgres";
import { useDemoRefresh } from "@/hooks/use-demo-refresh";
import { useToast } from "@/hooks/use-toast";
import {
  bemackMapCenter,
  getDemoWorkerPositions,
  useFieldOpsStore,
} from "@/store/field-ops-store";
import { buildHotspotTrail, type TrailPoint } from "@/lib/hotspot-trail";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { useHotspotTrailStore } from "@/store/hotspot-trail-store";
import { useScoutingStore } from "@/store/scouting-store";
import {
  listHotspots,
  updateHotspotStatus,
  type HotspotRow,
} from "@/services/supabase/infestation-service";
import { listSprays, listSpraysForHotspot } from "@/services/supabase/spray-service";
import { listScoutingForGreenhouseSince } from "@/services/supabase/scouting-service";
import { listWorkerPositions } from "@/services/supabase/position-service";
import type { MapFocus, SprayMarker, WorkerMarker } from "@/features/infestation/map-view";

const MapView = dynamic(
  () => import("@/features/infestation/map-view").then((m) => m.MapView),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full min-h-[480px] w-full" />,
  },
);

type SelectedItem =
  | { type: "hotspot"; data: HotspotRow }
  | { type: "spray"; data: SprayMarker }
  | { type: "worker"; data: WorkerMarker };

type MapLayers = {
  hotspots: boolean;
  sprays: boolean;
  workers: boolean;
};

export function FarmMap({ basePath = "/manager" }: { basePath?: "/manager" | "/admin" }) {
  const { toast } = useToast();
  const { tick } = useDemoRefresh();
  const demoHotspots = useFieldOpsStore((s) => s.demoHotspots);
  const demoSprays = useFieldOpsStore((s) => s.demoSprays);
  const updateDemoHotspotStatus = useFieldOpsStore((s) => s.updateDemoHotspotStatus);
  const demoScouting = useScoutingStore((s) => s.demoRecords);
  const getBreadcrumbs = useHotspotTrailStore((s) => s.getBreadcrumbs);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [showTrail, setShowTrail] = useState(true);
  const [hotspotTrail, setHotspotTrail] = useState<TrailPoint[]>([]);
  const [farmFilter, setFarmFilter] = useState<string>("all");
  const [layers, setLayers] = useState<MapLayers>({
    hotspots: true,
    sprays: true,
    workers: true,
  });
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const [hotspots, setHotspots] = useState<HotspotRow[]>([]);
  const [sprays, setSprays] = useState<SprayMarker[]>([]);
  const [positions, setPositions] = useState<WorkerMarker[]>([]);
  const [locateWorkersKey, setLocateWorkersKey] = useState(0);

  const refresh = useCallback(async () => {
    if (!hasSupabaseEnv()) {
      setHotspots(demoHotspots);
      setSprays(demoSprays);
      setPositions(getDemoWorkerPositions());
      setLoading(false);
      setMapReady(true);
      return;
    }

    try {
      const [h, s, p] = await Promise.all([
        listHotspots(),
        listSprays(100),
        listWorkerPositions(),
      ]);
      if (h.error) throw h.error;
      if (s.error) throw s.error;
      if (p.error) throw p.error;
      setHotspots((h.data as HotspotRow[]) ?? []);
      setSprays((s.data as SprayMarker[]) ?? []);
      setPositions(
        ((p.data as WorkerMarker[]) ?? []).filter(
          (row) =>
            (row.users?.role === "worker" || row.users?.role === undefined) &&
            Number.isFinite(row.latitude) &&
            Number.isFinite(row.longitude),
        ),
      );
    } catch (e) {
      toast({
        title: "Map data unavailable",
        description: e instanceof Error ? e.message : "Unknown error",
        tone: "error",
      });
    } finally {
      setLoading(false);
      setMapReady(true);
    }
  }, [toast, demoHotspots, demoSprays]);

  useEffect(() => {
    void refresh();
  }, [refresh, tick, demoHotspots.length, demoSprays.length]);

  useRealtimeHotspots(refresh);
  useRealtimePositions(refresh);
  useRealtimePostgres("spray-map", [{ table: "spray_treatments" }], refresh);

  useEffect(() => {
    if (!selected || selected.type !== "hotspot") {
      setHotspotTrail([]);
      return;
    }

    const hotspot = selected.data;
    const since = new Date(hotspot.created_at);
    const gpsCrumbs = getBreadcrumbs(hotspot.id);

    if (!hasSupabaseEnv()) {
      const linkedSprays = demoSprays.filter((s) => s.hotspot_id === hotspot.id);
      const linkedScouts = demoScouting
        .filter(
          (r) =>
            r.greenhouseId === hotspot.greenhouse_id &&
            r.latitude != null &&
            r.longitude != null &&
            new Date(r.recordedAt) >= since,
        )
        .map((r) => ({
          id: r.id,
          latitude: r.latitude!,
          longitude: r.longitude!,
          issue_name: r.issue,
          created_at: r.recordedAt,
          users: { full_name: r.scoutName },
        }));
      setHotspotTrail(
        buildHotspotTrail(hotspot, linkedSprays, linkedScouts, gpsCrumbs),
      );
      return;
    }

    void Promise.all([
      listSpraysForHotspot(hotspot.id),
      hotspot.greenhouse_id
        ? listScoutingForGreenhouseSince(hotspot.greenhouse_id, since)
        : Promise.resolve({ data: [], error: null }),
    ]).then(([spraysRes, scoutsRes]) => {
      const sprays = (spraysRes.data ?? []) as Parameters<typeof buildHotspotTrail>[1];
      const scouts = ((scoutsRes.data ?? []) as Array<{
        id: string;
        latitude: number;
        longitude: number;
        issue_name: string;
        recorded_at: string;
        users?: { full_name?: string } | null;
      }>).map((row) => ({
        id: row.id,
        latitude: row.latitude,
        longitude: row.longitude,
        issue_name: row.issue_name,
        created_at: row.recorded_at,
        users: row.users,
      }));
      setHotspotTrail(buildHotspotTrail(hotspot, sprays, scouts, gpsCrumbs));
    });
  }, [selected, demoSprays, demoScouting, getBreadcrumbs]);

  const farms = useMemo(() => {
    const names = new Set(
      hotspots.map((h) => h.farms?.name).filter(Boolean) as string[],
    );
    return ["all", ...Array.from(names)];
  }, [hotspots]);

  const filteredHotspots = useMemo(() => {
    if (farmFilter === "all") return hotspots;
    return hotspots.filter((h) => h.farms?.name === farmFilter);
  }, [hotspots, farmFilter]);

  const center = useMemo(() => {
    const points = [
      ...filteredHotspots.map((h) => ({ lat: h.latitude, lng: h.longitude })),
      ...sprays.map((s) => ({ lat: s.latitude, lng: s.longitude })),
      ...positions.map((p) => ({ lat: p.latitude, lng: p.longitude })),
    ];
    if (!points.length) return bemackMapCenter();
    const lat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
    const lng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;
    return { lat, lng };
  }, [filteredHotspots, sprays, positions]);

  const liveCounts = useMemo(
    () => ({
      hotspots: filteredHotspots.filter((h) => h.status === "active").length,
      sprays: sprays.length,
      workers: positions.length,
    }),
    [filteredHotspots, sprays.length, positions.length],
  );

  const toggleLayer = (layer: keyof MapLayers) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const selectHotspot = useCallback((row: HotspotRow) => {
    setLayers((prev) => ({ ...prev, hotspots: true }));
    setSelected({ type: "hotspot", data: row });
  }, []);

  const selectSpray = useCallback((row: SprayMarker) => {
    setLayers((prev) => ({ ...prev, sprays: true }));
    setSelected({ type: "spray", data: row });
  }, []);

  const selectWorker = useCallback((row: WorkerMarker) => {
    setLayers((prev) => ({ ...prev, workers: true }));
    setSelected({ type: "worker", data: row });
  }, []);

  const mapFocus = useMemo((): MapFocus | null => {
    if (locateWorkersKey > 0 && positions[0]) {
      return {
        lat: positions[0].latitude,
        lng: positions[0].longitude,
        key: `locate-workers-${locateWorkersKey}-${positions[0].worker_id}`,
      };
    }
    if (!selected) return null;
    if (selected.type === "hotspot") {
      return {
        lat: selected.data.latitude,
        lng: selected.data.longitude,
        key: `hotspot-${selected.data.id}`,
      };
    }
    if (selected.type === "spray") {
      return {
        lat: selected.data.latitude,
        lng: selected.data.longitude,
        key: `spray-${selected.data.id}`,
      };
    }
    return {
      lat: selected.data.latitude,
      lng: selected.data.longitude,
      key: `worker-${selected.data.worker_id}`,
    };
  }, [selected, locateWorkersKey, positions]);

  const staleWorker = useMemo(() => {
    if (!positions.length) return null;
    const newest = positions
      .map((p) => (p.updated_at ? new Date(p.updated_at).getTime() : 0))
      .sort((a, b) => b - a)[0];
    if (!newest) return null;
    const ageMin = (Date.now() - newest) / 60_000;
    if (ageMin < 30) return null;
    return { ageMin, name: positions[0]?.users?.full_name ?? "Worker" };
  }, [positions]);

  const markStatus = async (status: "sprayed" | "resolved") => {
    if (!selected || selected.type !== "hotspot") return;
    const hotspot = selected.data;

    try {
      if (!hasSupabaseEnv()) {
        updateDemoHotspotStatus(hotspot.id, status);
        setHotspots((prev) =>
          prev.map((h) => (h.id === hotspot.id ? { ...h, status } : h)),
        );
        toast({ title: `Marked as ${status}`, tone: "success" });
        setSelected(null);
        return;
      }
      const { error } = await updateHotspotStatus(hotspot.id, status);
      if (error) throw error;
      toast({ title: `Marked as ${status}`, tone: "success" });
      setSelected(null);
      void refresh();
    } catch (e) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : "Unknown error",
        tone: "error",
      });
    }
  };

  return (
    <section className="farm-map-shell overflow-hidden rounded-2xl border border-border shadow-sm">
      <div className="flex items-center gap-2 bg-primary px-4 py-3 text-primary-foreground">
        <MapPin className="size-5 shrink-0" />
        <div>
          <h2 className="text-base font-semibold leading-tight">Map</h2>
          <p className="text-xs text-primary-foreground/80">Hotspots, sprays, and workers</p>
        </div>
      </div>

      <div className="relative h-[min(72vh,680px)] min-h-[480px] w-full bg-[#e8eaed]">
        {!mapReady && loading ? (
          <Skeleton className="h-full w-full rounded-none" />
        ) : (
          <MapView
            center={center}
            focus={mapFocus}
            trail={selected?.type === "hotspot" && showTrail ? hotspotTrail : null}
            hotspots={layers.hotspots ? filteredHotspots : []}
            sprays={layers.sprays ? sprays : []}
            positions={layers.workers ? positions : []}
            onSelectHotspot={selectHotspot}
            onSelectSpray={selectSpray}
            onSelectWorker={selectWorker}
          />
        )}

        <div className="farm-map-overlay farm-map-overlay--legend">
          <label className="farm-map-chip min-w-[9rem]">
            <span className="sr-only">Farm filter</span>
            <AppSelect
              aria-label="Farm filter"
              size="sm"
              align="start"
              className="min-w-[8rem]"
              nativeClassName="farm-map-chip-select"
              value={farmFilter}
              onChange={setFarmFilter}
              options={farms.map((f) => ({
                value: f,
                label: f === "all" ? "All farms" : f,
              }))}
            />
          </label>
          <button
            type="button"
            className={cn("farm-map-chip farm-map-chip-toggle", layers.hotspots && "farm-map-chip--active")}
            aria-pressed={layers.hotspots}
            aria-label="Show or hide hotspot markers on the map"
            onClick={() => toggleLayer("hotspots")}
          >
            <span className="farm-map-dot farm-map-dot--hotspot" />
            Hotspots ({liveCounts.hotspots})
          </button>
          <button
            type="button"
            className={cn("farm-map-chip farm-map-chip-toggle", layers.sprays && "farm-map-chip--active")}
            aria-pressed={layers.sprays}
            aria-label="Show or hide spray markers on the map"
            onClick={() => toggleLayer("sprays")}
          >
            <span className="farm-map-dot farm-map-dot--spray" />
            Sprays ({liveCounts.sprays})
          </button>
          <button
            type="button"
            className={cn("farm-map-chip farm-map-chip-toggle", layers.workers && "farm-map-chip--active")}
            aria-pressed={layers.workers}
            aria-label="Show or hide field worker GPS markers on the map"
            onClick={() => {
              if (layers.workers && positions.length) {
                setLocateWorkersKey((k) => k + 1);
                setSelected({ type: "worker", data: positions[0] });
                return;
              }
              toggleLayer("workers");
              if (!layers.workers && positions[0]) {
                setLocateWorkersKey((k) => k + 1);
                setSelected({ type: "worker", data: positions[0] });
              }
            }}
          >
            <span className="farm-map-dot farm-map-dot--worker" />
            Workers ({liveCounts.workers})
          </button>
        </div>

        {staleWorker ? (
          <p className="farm-map-overlay pointer-events-none absolute bottom-3 left-3 z-[500] max-w-xs rounded-xl border border-amber-500/40 bg-amber-50/95 px-3 py-2 text-xs text-amber-950 shadow-sm dark:bg-amber-950/90 dark:text-amber-50">
            Worker GPS last updated ~{Math.round(staleWorker.ageMin)} min ago
            {staleWorker.ageMin >= 60
              ? ` (${Math.round(staleWorker.ageMin / 60)}h). Open the field app to refresh live position.`
              : ". Tap Workers to fly to the last known position."}
          </p>
        ) : null}

        {selected ? (
          <aside className="farm-map-detail-sheet">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {selected.type === "hotspot" ? (
                  <>
                    <p className="text-xs font-medium uppercase tracking-wide text-red-600">
                      Hotspot
                    </p>
                    <h3 className="text-lg font-semibold">{selected.data.pest_type}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selected.data.greenhouses?.name ?? "—"} · Severity{" "}
                      {selected.data.severity}/5
                    </p>
                    <p className="mt-3 text-sm">
                      <strong>Problem:</strong> {selected.data.problem}
                    </p>
                    <p className="mt-2 text-sm">
                      <strong>Main issue:</strong> {selected.data.main_issue}
                    </p>
                    {hotspotTrail.length > 1 ? (
                      <div className="mt-3 rounded-xl bg-muted/40 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Visit trail
                        </p>
                        <ol className="mt-2 space-y-1 text-sm">
                          {hotspotTrail
                            .filter((point) => point.kind !== "gps")
                            .map((point, index) => (
                              <li key={point.id}>
                                {index + 1}. {point.label}
                              </li>
                            ))}
                          {hotspotTrail.some((point) => point.kind === "gps") ? (
                            <li className="text-xs text-muted-foreground">
                              + worker GPS path on the way
                            </li>
                          ) : null}
                        </ol>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">
                        No follow-up visits yet. Worker can tap Resume here in the field app.
                      </p>
                    )}
                  </>
                ) : null}

                {selected.type === "spray" ? (
                  <>
                    <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                      Spray log
                    </p>
                    <h3 className="text-lg font-semibold">{selected.data.product_name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selected.data.farms?.name ?? "—"} /{" "}
                      {selected.data.greenhouses?.name ?? "—"}
                    </p>
                    <p className="mt-2 text-sm">
                      <strong>Applied by:</strong>{" "}
                      {selected.data.users?.full_name ?? "Worker"}
                    </p>
                    <p className="mt-2 text-sm">
                      <strong>Map location:</strong>{" "}
                      {selected.data.latitude.toFixed(5)}, {selected.data.longitude.toFixed(5)}
                    </p>
                    {selected.data.notes ? (
                      <p className="mt-2 text-sm">
                        <strong>Notes:</strong> {selected.data.notes}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-muted-foreground">
                      Logged{" "}
                      {formatDistanceToNow(new Date(selected.data.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </>
                ) : null}

                {selected.type === "worker" ? (
                  <>
                    <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                      Field worker GPS
                    </p>
                    <h3 className="text-lg font-semibold">
                      {selected.data.users?.full_name ?? "Worker"}
                    </h3>
                    <p className="mt-2 text-sm">
                      <strong>Last field position:</strong>{" "}
                      {selected.data.latitude.toFixed(5)}, {selected.data.longitude.toFixed(5)}
                    </p>
                    {selected.data.updated_at ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        GPS updated{" "}
                        {formatDistanceToNow(new Date(selected.data.updated_at), {
                          addSuffix: true,
                        })}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Live position from worker device in the field
                      </p>
                    )}
                  </>
                ) : null}
              </div>
              <button
                type="button"
                className="farm-map-control-btn farm-map-control-btn--ghost"
                aria-label="Close details"
                onClick={() => setSelected(null)}
              >
                <X className="size-4" />
              </button>
            </div>

            {selected.type === "hotspot" ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowTrail((value) => !value)}
                >
                  {showTrail ? "Hide trail" : "Show trail"}
                </Button>
                <Button size="sm" onClick={() => void markStatus("sprayed")}>
                  Mark sprayed
                </Button>
                <Button size="sm" variant="outline" onClick={() => void markStatus("resolved")}>
                  Mark resolved
                </Button>
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>
    </section>
  );
}
