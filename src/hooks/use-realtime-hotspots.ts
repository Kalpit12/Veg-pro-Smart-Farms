"use client";

import { hasMssqlEnv } from "@/lib/data-backend";
import { useMssqlPoll, type MssqlPollOptions } from "@/hooks/use-mssql-poll";
import { useRealtimePostgres } from "@/hooks/use-realtime-postgres";

const HOTSPOTS_TABLE = [{ table: "infestation_hotspots" }];

export function useRealtimeHotspots(onChange: () => void, options?: MssqlPollOptions) {
  const poll = options?.enabled ?? true;
  useRealtimePostgres("hotspots", HOTSPOTS_TABLE, onChange, {
    disabled: hasMssqlEnv() || !poll,
  });
  useMssqlPoll(onChange, { enabled: poll, intervalMs: options?.intervalMs });
}
