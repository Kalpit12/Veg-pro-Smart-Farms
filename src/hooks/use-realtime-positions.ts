"use client";

import { useRealtimePostgres } from "@/hooks/use-realtime-postgres";

const POSITIONS_TABLES = [
  { table: "worker_positions" },
  { table: "spray_treatments" },
];

export function useRealtimePositions(onChange: () => void) {
  useRealtimePostgres("positions", POSITIONS_TABLES, onChange);
}
