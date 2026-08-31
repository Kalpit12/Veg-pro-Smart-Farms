"use client";

import { useCallback, useEffect, useState } from "react";

import { useRealtimeHotspots } from "@/hooks/use-realtime-hotspots";
import {
  type HotspotResolutionRef,
} from "@/lib/issue-resolution";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { listHotspots } from "@/services/supabase/infestation-service";
import { useFieldOpsStore } from "@/store/field-ops-store";

function toResolutionRefs(
  rows: {
    pest_type: string;
    status: string;
    greenhouses?: { name?: string } | null;
  }[],
): HotspotResolutionRef[] {
  return rows.map((row) => ({
    greenhouseName: row.greenhouses?.name ?? "",
    pestType: row.pest_type,
    status: row.status as HotspotResolutionRef["status"],
  }));
}

export function useHotspotResolutionRefs() {
  const demoHotspots = useFieldOpsStore((s) => s.demoHotspots);
  const [hotspots, setHotspots] = useState<HotspotResolutionRef[]>([]);

  const refresh = useCallback(async () => {
    if (!hasSupabaseEnv()) {
      setHotspots(toResolutionRefs(demoHotspots));
      return;
    }

    const { data, error } = await listHotspots(200);
    if (error) return;
    setHotspots(toResolutionRefs(data ?? []));
  }, [demoHotspots]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useRealtimeHotspots(refresh);

  return hotspots;
}
