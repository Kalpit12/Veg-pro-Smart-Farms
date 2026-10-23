"use client";

import Link from "next/link";
import { Bug, ClipboardList, Droplets, MapPin, Users } from "lucide-react";
import { useScoutingData } from "@/hooks/use-scouting-data";
import { useCallback, useEffect, useState } from "react";

import { MetricCard } from "@/features/dashboard/components/metric-card";
import { useManagerDashboardFilterApply } from "@/hooks/use-manager-dashboard-filter-apply";
import { useRealtimeHotspots } from "@/hooks/use-realtime-hotspots";
import { useRealtimePositions } from "@/hooks/use-realtime-positions";
import { useToast } from "@/hooks/use-toast";
import { getDemoKpis } from "@/lib/demo-field-data";
import { hasConfiguredBackend, isOfflineDemo } from "@/lib/data-backend";
import { getDashboardKpis } from "@/services/supabase/dashboard-service";
import { listActiveHotspots } from "@/services/supabase/infestation-service";
import { listSprays } from "@/services/supabase/spray-service";

export function MetricsGrid({
  audience = "manager",
  liveUpdates = true,
  managerDashboardFilters = false,
}: {
  audience?: "manager" | "admin";
  liveUpdates?: boolean;
  managerDashboardFilters?: boolean;
}) {
  const { matches } = useManagerDashboardFilterApply(managerDashboardFilters);
  const pollOpts = { enabled: liveUpdates };
  const scoutingDays = managerDashboardFilters ? 14 : 1;
  const { records: scoutingRecords } = useScoutingData(scoutingDays, {
    ...pollOpts,
    recordLimit: managerDashboardFilters ? 400 : 200,
  });
  const [kpis, setKpis] = useState({
    activeHotspots: 0,
    spraysToday: 0,
    workersInField: 0,
    severeHotspots: 0,
    scoutingStopsToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    if (isOfflineDemo()) {
      const base = getDemoKpis();
      const scoutingStopsToday = scoutingRecords.filter((r) => {
        const d = new Date(r.recordedAt);
        const t = new Date();
        return d.toDateString() === t.toDateString();
      }).length;
      setKpis({ ...base, scoutingStopsToday });
      setLoading(false);
      return;
    }

    try {
      let next = {
        activeHotspots: 0,
        severeHotspots: 0,
        spraysToday: 0,
        workersInField: 0,
        scoutingStopsToday: 0,
      };
      try {
        next = await getDashboardKpis();
      } catch (kpiError) {
        toast({
          title: "Dashboard metrics slow",
          description:
            kpiError instanceof Error
              ? kpiError.message
              : "SQL timed out loading KPIs. Showing filtered counts only.",
          tone: "error",
        });
      }
      if (managerDashboardFilters) {
        const [hotRes, sprayRes] = await Promise.all([
          listActiveHotspots(100),
          listSprays(100),
        ]);
        const hotspots = (hotRes.data ?? []).filter((h) => {
          const row = h as {
            farm_id: string;
            greenhouse_id: string | null;
            greenhouses?: { name?: string; crop_type?: string } | null;
            severity: number;
            created_at: string;
          };
          return matches({
            farmId: row.farm_id,
            greenhouseId: row.greenhouse_id,
            greenhouseName: row.greenhouses?.name,
            cropType: row.greenhouses?.crop_type ?? null,
            createdAt: row.created_at,
          });
        });
        const sprays = (sprayRes.data ?? []).filter((s) => {
          const row = s as {
            farm_id: string;
            greenhouse_id: string | null;
            greenhouses?: { name?: string; crop_type?: string } | null;
            created_at: string;
          };
          return matches({
            farmId: row.farm_id,
            greenhouseId: row.greenhouse_id,
            greenhouseName: row.greenhouses?.name,
            cropType: row.greenhouses?.crop_type ?? null,
            createdAt: row.created_at,
          });
        });
        const stops = scoutingRecords.filter((r) =>
          matches({
            farmId: r.farmId,
            greenhouseId: r.greenhouseId,
            greenhouseName: r.greenhouseName,
            cropType: r.variety,
            createdAt: r.recordedAt,
          }),
        );
        setKpis({
          activeHotspots: hotspots.length,
          severeHotspots: hotspots.filter((h) => (h as { severity: number }).severity >= 4).length,
          spraysToday: sprays.length,
          workersInField: next.workersInField,
          scoutingStopsToday: stops.length,
        });
      } else {
        setKpis({
          activeHotspots: next.activeHotspots,
          spraysToday: next.spraysToday,
          workersInField: next.workersInField,
          severeHotspots: next.severeHotspots,
          scoutingStopsToday: next.scoutingStopsToday,
        });
      }
    } catch (e) {
      toast({
        title: "Dashboard not ready",
        description:
          e instanceof Error
            ? e.message
            : hasConfiguredBackend()
              ? "Database query failed. Check server logs and SQL migrations."
              : "Connect Supabase and run migrations.",
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, scoutingRecords, managerDashboardFilters, audience, matches]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onConfig = () => void refresh();
    window.addEventListener("vegpro-runtime-config", onConfig);
    return () => window.removeEventListener("vegpro-runtime-config", onConfig);
  }, [refresh]);

  useRealtimeHotspots(refresh, pollOpts);
  useRealtimePositions(refresh, pollOpts);

  const demoScoutingToday = isOfflineDemo()
    ? scoutingRecords.filter((r) => {
        const d = new Date(r.recordedAt);
        const t = new Date();
        return d.toDateString() === t.toDateString();
      }).length
    : kpis.scoutingStopsToday;

  const workforceHref = audience === "admin" ? "/admin/workforce" : "/manager/workers";
  const mapHref = audience === "admin" ? "/admin/map" : "/manager/map";
  const scoutingHref = audience === "admin" ? "/admin/scouting" : "/manager/scouting";
  const historyHref = audience === "admin" ? "/admin/history" : "/manager/history";

  const managerCards = [
    {
      label: "Hotspots",
      value: String(kpis.activeHotspots),
      icon: Bug,
      tone: kpis.activeHotspots > 0 ? ("alert" as const) : ("default" as const),
      href: mapHref,
    },
    {
      label: "Urgent",
      value: String(kpis.severeHotspots),
      icon: MapPin,
      tone: kpis.severeHotspots > 0 ? ("alert" as const) : ("default" as const),
      href: mapHref,
    },
    {
      label: managerDashboardFilters ? "Sprays" : "Sprays today",
      value: String(kpis.spraysToday),
      icon: Droplets,
      tone: "success" as const,
      href: historyHref,
    },
    {
      label: "Workers in field",
      value: String(kpis.workersInField),
      icon: Users,
      tone: "default" as const,
      href: workforceHref,
    },
  ];

  const adminCards = [
    {
      label: "Scouting rounds",
      value: String(demoScoutingToday),
      icon: ClipboardList,
      tone: demoScoutingToday > 0 ? ("success" as const) : ("default" as const),
      href: scoutingHref,
    },
    managerCards[0],
    {
      label: "Sprays",
      value: String(kpis.spraysToday),
      icon: Droplets,
      tone: "success" as const,
      href: historyHref,
    },
    {
      label: "Active workers",
      value: String(kpis.workersInField),
      icon: Users,
      tone: "default" as const,
      href: workforceHref,
    },
    {
      ...managerCards[1],
      label: "Urgent attention",
    },
  ];

  const cards = audience === "admin" ? adminCards : managerCards;

  return (
    <div
      className={
        audience === "admin"
          ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
          : "grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      }
    >
      {cards.map((card, index) => (
        <Link key={card.label} href={card.href} className="block">
          <MetricCard
            label={card.label}
            value={card.value}
            icon={card.icon}
            loading={loading}
            tone={card.tone}
            delay={index * 0.08}
          />
        </Link>
      ))}
    </div>
  );
}
