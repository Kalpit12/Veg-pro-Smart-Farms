"use client";

import type { MssqlPollOptions } from "@/hooks/use-mssql-poll";
import { useRealtimePostgres } from "@/hooks/use-realtime-postgres";

const FIELD_FEED_TABLES = [
  { table: "spray_treatments" },
  { table: "infestation_hotspots" },
  { table: "scouting_records" },
  { table: "activities" },
];

export function useRealtimeFieldFeed(
  onChange: () => void,
  options?: Pick<MssqlPollOptions, "enabled">,
) {
  const poll = options?.enabled ?? true;
  useRealtimePostgres("field-feed", FIELD_FEED_TABLES, onChange, { disabled: !poll });
}
