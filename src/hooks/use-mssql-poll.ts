"use client";

import { useEffect } from "react";

import { hasMssqlEnv } from "@/lib/data-backend";

const DEFAULT_MS = 12_000;

/** Poll when MS SQL replaces Supabase Realtime. */
export function useMssqlPoll(onChange: () => void, intervalMs = DEFAULT_MS) {
  useEffect(() => {
    if (!hasMssqlEnv()) return;
    const id = window.setInterval(() => onChange(), intervalMs);
    return () => window.clearInterval(id);
  }, [onChange, intervalMs]);
}
