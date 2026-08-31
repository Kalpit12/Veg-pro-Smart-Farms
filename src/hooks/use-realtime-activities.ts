"use client";

import { useRealtimePostgres } from "@/hooks/use-realtime-postgres";

const ACTIVITY_LOG_TABLES = [
  { table: "activities" },
  { table: "infestation_hotspots" },
  { table: "spray_treatments" },
  { table: "scouting_records" },
];

export function useRealtimeActivityLogs(onChange: () => void) {
  useRealtimePostgres("activity-logs", ACTIVITY_LOG_TABLES, onChange);
}

/** @deprecated Use useRealtimeActivityLogs */
export function useRealtimeActivities(onChange: () => void) {
  useRealtimeActivityLogs(onChange);
}
