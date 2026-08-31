"use client";

import Link from "next/link";
import { Bug, ClipboardList, Droplets, MapPin, Users } from "lucide-react";
import { useScoutingData } from "@/hooks/use-scouting-data";
import { useCallback, useEffect, useState } from "react";

import { MetricCard } from "@/features/dashboard/components/metric-card";
import { useRealtimeHotspots } from "@/hooks/use-realtime-hotspots";
import { useRealtimePositions } from "@/hooks/use-realtime-positions";
import { useRealtimeScouting } from "@/hooks/use-realtime-scouting";
import { useToast } from "@/hooks/use-toast";
import { getDemoKpis } from "@/lib/demo-field-data";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { getDashboardKpis } from "@/services/supabase/dashboard-service";

export function MetricsGrid({ audience = "manager" }: { audience?: "manager" | "admin" }) {
  const { records: scoutingRecords } = useScoutingData(1);
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
    if (!hasSupabaseEnv()) {
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
      const next = await getDashboardKpis();
      setKpis({
        activeHotspots: next.activeHotspots,
        spraysToday: next.spraysToday,
        workersInField: next.workersInField,
        severeHotspots: next.severeHotspots,
        scoutingStopsToday: next.scoutingStopsToday,
      });
    } catch (e) {
      toast({
        title: "Dashboard not ready",
        description:
          e instanceof Error
            ? e.message
            : "Connect Supabase and run migrations.",
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, scoutingRecords]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useRealtimeHotspots(refresh);
  useRealtimePositions(refresh);
  useRealtimeScouting(refresh);

  const demoScoutingToday = !hasSupabaseEnv()
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
      label: "Sprays today",
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
      label: "Scouting",
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
      label: "Workers",
      value: String(kpis.workersInField),
      icon: Users,
      tone: "default" as const,
      href: workforceHref,
    },
    managerCards[1],
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
