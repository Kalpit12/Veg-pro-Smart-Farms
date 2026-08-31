"use client";

import { useRealtimePostgres } from "@/hooks/use-realtime-postgres";

const SCOUTING_TABLES = [
  { table: "scouting_records" },
  { table: "scouting_rounds" },
];

export function useRealtimeScouting(onChange: () => void) {
  useRealtimePostgres("scouting", SCOUTING_TABLES, onChange);
}
