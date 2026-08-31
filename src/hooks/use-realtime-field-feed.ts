"use client";

import { useRealtimePostgres } from "@/hooks/use-realtime-postgres";

const FIELD_FEED_TABLES = [
  { table: "spray_treatments" },
  { table: "infestation_hotspots" },
  { table: "scouting_records" },
  { table: "activities" },
];

export function useRealtimeFieldFeed(onChange: () => void) {
  useRealtimePostgres("field-feed", FIELD_FEED_TABLES, onChange);
}
