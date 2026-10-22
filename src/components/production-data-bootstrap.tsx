"use client";

import { useEffect } from "react";

import { hasConfiguredBackend, isOfflineDemo } from "@/lib/data-backend";
import { useAppRuntimeStore } from "@/store/app-runtime-store";
import { useFieldOpsStore } from "@/store/field-ops-store";
import { useScoutingStore } from "@/store/scouting-store";

function clearPersistedDemoStores() {
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
}

/** MS SQL / Supabase prod: hydrate mode from server + clear browser demo caches. */
export function ProductionDataBootstrap() {
  const hydrateFromServer = useAppRuntimeStore((s) => s.hydrateFromServer);

  useEffect(() => {
    void hydrateFromServer().then(() => {
      if (!isOfflineDemo()) clearPersistedDemoStores();
    });
  }, [hydrateFromServer]);

  useEffect(() => {
    if (hasConfiguredBackend()) clearPersistedDemoStores();
  }, []);

  return null;
}
