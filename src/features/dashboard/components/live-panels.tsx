"use client";

import { LiveConnectionStatus } from "@/features/dashboard/components/live-connection-status";

export function LivePanels() {
  return (
    <div className="glass-card rounded-2xl p-4">
      <h3 className="text-sm font-semibold">Realtime Operations</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Hotspots, sprays, and worker GPS update automatically on the map.
      </p>
      <div className="mt-3">
        <LiveConnectionStatus />
      </div>
    </div>
  );
}
