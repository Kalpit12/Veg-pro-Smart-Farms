"use client";

import { useEffect, useState } from "react";

import { hasConfiguredBackend, isOfflineDemo } from "@/lib/data-backend";

/** Re-renders demo UIs so relative timestamps stay accurate */
export function useDemoRefresh(intervalMs = 45_000) {
  const [tick, setTick] = useState(0);
  const demo = isOfflineDemo();

  useEffect(() => {
    if (!demo) return;
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [demo, intervalMs]);

  return { demo, tick };
}
