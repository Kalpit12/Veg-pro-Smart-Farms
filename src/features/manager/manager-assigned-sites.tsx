"use client";

import { useEffect, useState } from "react";

import { getMyAssignedSitesAction } from "@/features/admin/supervisor-access-actions";
import type { FarmGreenhouseCatalogItem } from "@/services/supervisor-access-service";

export function ManagerAssignedSites() {
  const [sites, setSites] = useState<FarmGreenhouseCatalogItem[] | null>(null);

  useEffect(() => {
    void getMyAssignedSitesAction().then((result) => {
      setSites(result.data ?? []);
    });
  }, []);

  if (sites === null) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">Loading your assigned sites…</p>
    );
  }

  if (!sites.length) {
    return null;
  }

  return (
    <div className="mt-2 space-y-2 border-t border-border/50 pt-2">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Your farms &amp; greenhouses
      </p>
      <ul className="space-y-2">
        {sites.map((farm) => (
          <li key={farm.farmId} className="text-sm leading-snug">
            <span className="font-semibold text-foreground">{farm.farmName}</span>
            <span className="text-muted-foreground">
              {" "}
              — {farm.greenhouses.map((g) => g.name).join(", ")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
