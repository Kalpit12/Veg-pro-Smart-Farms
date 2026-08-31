"use client";

import { useRealtimePostgres } from "@/hooks/use-realtime-postgres";

const ALERTS_TABLE = [{ table: "alerts" }];

export function useRealtimeAlerts(onChange: () => void) {
  useRealtimePostgres("alerts", ALERTS_TABLE, onChange);
}
