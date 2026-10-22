"use client";

import { useCallback, useEffect, useState } from "react";
import { Radio } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { LivePulseDot } from "@/components/ui/live-pulse-dot";
import { useRealtimeHotspots } from "@/hooks/use-realtime-hotspots";
import { useRealtimePositions } from "@/hooks/use-realtime-positions";
import { useRealtimeAlerts } from "@/hooks/use-realtime-alerts";

export function LiveConnectionStatus() {
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const markUpdated = useCallback(() => {
    setLastUpdate(new Date());
  }, []);

  useRealtimeHotspots(markUpdated);
  useRealtimePositions(markUpdated);
  useRealtimeAlerts(markUpdated);

  useEffect(() => {
    setLastUpdate(new Date());
  }, []);

  return (
    <div className="flex items-center gap-2 rounded-full border border-border/80 bg-background/70 px-3 py-1.5 text-xs">
      <LivePulseDot />
      <Radio className="size-3.5 text-primary" />
      <span className="font-medium text-foreground">Live</span>
      <Badge variant="success">
        {lastUpdate
          ? `Updated ${lastUpdate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
          : "Connected"}
      </Badge>
    </div>
  );
}
