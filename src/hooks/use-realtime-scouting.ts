"use client";

import { hasMssqlEnv } from "@/lib/data-backend";
import { useMssqlPoll, type MssqlPollOptions } from "@/hooks/use-mssql-poll";
import { useRealtimePostgres } from "@/hooks/use-realtime-postgres";

const SCOUTING_TABLES = [
  { table: "scouting_records" },
  { table: "scouting_rounds" },
];

export function useRealtimeScouting(onChange: () => void, options?: MssqlPollOptions) {
  const poll = options?.enabled ?? true;
  useRealtimePostgres("scouting", SCOUTING_TABLES, onChange, {
    disabled: hasMssqlEnv() || !poll,
  });
  useMssqlPoll(onChange, { enabled: poll, intervalMs: options?.intervalMs });
}
