"use client";

import { hasMssqlEnv } from "@/lib/data-backend";
import { useMssqlPoll, type MssqlPollOptions } from "@/hooks/use-mssql-poll";
import { useRealtimePostgres } from "@/hooks/use-realtime-postgres";

const POSITIONS_TABLES = [
  { table: "worker_positions" },
  { table: "spray_treatments" },
];

export function useRealtimePositions(onChange: () => void, options?: MssqlPollOptions) {
  const poll = options?.enabled ?? true;
  useRealtimePostgres("positions", POSITIONS_TABLES, onChange, {
    disabled: hasMssqlEnv() || !poll,
  });
  useMssqlPoll(onChange, { enabled: poll, intervalMs: options?.intervalMs });
}
