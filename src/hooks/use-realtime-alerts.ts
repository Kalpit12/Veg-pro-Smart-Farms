"use client";

import { hasMssqlEnv } from "@/lib/data-backend";
import { useMssqlPoll } from "@/hooks/use-mssql-poll";
import { useRealtimePostgres } from "@/hooks/use-realtime-postgres";

const ALERTS_TABLE = [{ table: "alerts" }];

export function useRealtimeAlerts(onChange: () => void) {
  useRealtimePostgres("alerts", ALERTS_TABLE, onChange, { disabled: hasMssqlEnv() });
  useMssqlPoll(onChange);
}
