"use client";

import { hasMssqlEnv } from "@/lib/data-backend";
import { useMssqlPoll, type MssqlPollOptions } from "@/hooks/use-mssql-poll";
import { useRealtimePostgres } from "@/hooks/use-realtime-postgres";

const ALERTS_TABLE = [{ table: "alerts" }];

export function useRealtimeAlerts(onChange: () => void, options?: MssqlPollOptions) {
  const poll = options?.enabled ?? true;
  useRealtimePostgres("alerts", ALERTS_TABLE, onChange, {
    disabled: hasMssqlEnv() || !poll,
  });
  useMssqlPoll(onChange, { enabled: poll, intervalMs: options?.intervalMs });
}
