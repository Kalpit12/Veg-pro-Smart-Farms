"use client";

import { useEffect, useState } from "react";

import { resolveBasemapConfig, type BasemapConfig } from "@/lib/map-basemap";

export function useMapBasemap(): BasemapConfig | null {
  const [config, setConfig] = useState<BasemapConfig | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/map/basemap", { cache: "no-store" })
      .then((res) => res.json() as Promise<BasemapConfig>)
      .then((data) => {
        if (!cancelled && data?.url) setConfig(data);
      })
      .catch(() => {
        if (!cancelled) setConfig(resolveBasemapConfig(process.env));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return config;
}
