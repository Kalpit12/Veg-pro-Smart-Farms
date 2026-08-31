"use client";

import { useRealtimePostgres } from "@/hooks/use-realtime-postgres";

const HOTSPOTS_TABLE = [{ table: "infestation_hotspots" }];

export function useRealtimeHotspots(onChange: () => void) {
  useRealtimePostgres("hotspots", HOTSPOTS_TABLE, onChange);
}
