"use client";

import { useEffect } from "react";

import { hasConfiguredBackend } from "@/lib/data-backend";
import { useFieldOpsStore } from "@/store/field-ops-store";
import { useScoutingStore } from "@/store/scouting-store";

/** MS SQL / Supabase prod: do not show persisted browser demo scouting data. */
export function ProductionDataBootstrap() {
  useEffect(() => {
    if (!hasConfiguredBackend()) return;
    useScoutingStore.setState({
      demoRecords: [],
      demoRounds: [],
      demoRoutePoints: [],
      activeRoundId: null,
    });
    useFieldOpsStore.setState({
      demoHotspots: [],
      demoSprays: [],
      demoAlerts: [],
    });
  }, []);
  return null;
}
