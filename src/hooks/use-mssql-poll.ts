"use client";

import { useEffect } from "react";

import { hasMssqlEnv } from "@/lib/data-backend";

const DEFAULT_MS = 12_000;

export type MssqlPollOptions = {
  enabled?: boolean;
  intervalMs?: number;
};

/** Poll when MS SQL replaces Supabase Realtime. */
export function useMssqlPoll(onChange: () => void, options?: MssqlPollOptions) {
  const enabled = options?.enabled ?? true;
  const intervalMs = options?.intervalMs ?? DEFAULT_MS;

  useEffect(() => {
    if (!hasMssqlEnv() || !enabled) return;
    const id = window.setInterval(() => onChange(), intervalMs);
    return () => window.clearInterval(id);
  }, [onChange, intervalMs, enabled]);
}
