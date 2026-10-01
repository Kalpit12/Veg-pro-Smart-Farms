"use client";

import { useEffect } from "react";

import { hasMssqlEnv } from "@/lib/data-backend";
import { useRealtimePostgres } from "@/hooks/use-realtime-postgres";

const SCOUTING_TABLES = [
  { table: "scouting_records" },
  { table: "scouting_rounds" },
];

const MSSQL_POLL_MS = 12_000;

export function useRealtimeScouting(onChange: () => void) {
  useRealtimePostgres("scouting", SCOUTING_TABLES, onChange, { disabled: hasMssqlEnv() });

  useEffect(() => {
    if (!hasMssqlEnv()) return;
    const id = window.setInterval(() => {
      onChange();
    }, MSSQL_POLL_MS);
    return () => window.clearInterval(id);
  }, [onChange]);
}
