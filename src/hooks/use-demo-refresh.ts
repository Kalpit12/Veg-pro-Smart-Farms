"use client";

import { useEffect, useState } from "react";

import { hasSupabaseEnv } from "@/lib/supabase/config";

/** Re-renders demo UIs so relative timestamps stay accurate */
export function useDemoRefresh(intervalMs = 45_000) {
  const [tick, setTick] = useState(0);
  const demo = !hasSupabaseEnv();

  useEffect(() => {
    if (!demo) return;
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [demo, intervalMs]);

  return { demo, tick };
}
