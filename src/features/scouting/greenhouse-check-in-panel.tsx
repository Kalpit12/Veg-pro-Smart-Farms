"use client";

import { useState } from "react";
import { QrCode, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BEMACK_DEMO_LOCATIONS,
  formatStarGreenhouseLabel,
} from "@/lib/bemack-master-data";
import { useScanStore } from "@/store/scan-store";
import { useToast } from "@/hooks/use-toast";

/**
 * Greenhouse entrance check-in via QR or quick select.
 * Ties into the existing scan store used by the field scouting flow.
 */
export function GreenhouseCheckInPanel() {
  const scan = useScanStore();
  const setContext = useScanStore((s) => s.setContext);
  const { toast } = useToast();
  const [manualGh, setManualGh] = useState("");

  const checkedIn = Boolean(scan.farmId && scan.greenhouseId && scan.qrValue);

  const checkIn = (greenhouseName: string, qrValue?: string) => {
    const loc = BEMACK_DEMO_LOCATIONS.find((l) => l.greenhouseName === greenhouseName);
    if (!loc) return;
    setContext({
      farmId: loc.farmId,
      greenhouseId: loc.greenhouseId,
      farmName: loc.farmName,
      greenhouseName: loc.greenhouseName,
      qrValue: qrValue ?? loc.qrValue,
      assignmentLocked: true,
    });
    toast({
      title: "Greenhouse check-in",
      description: `Verified at ${loc.greenhouseName}`,
      tone: "success",
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-card/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <QrCode className="size-4 text-primary" />
          <div>
            <p className="text-sm font-semibold">Greenhouse check-in</p>
            <p className="text-xs text-muted-foreground">
              Scan entrance QR/NFC or confirm the house before starting a route.
            </p>
          </div>
        </div>
        {checkedIn ? (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="size-3" />
            Checked in
          </Badge>
        ) : (
          <Badge variant="outline">Not verified</Badge>
        )}
      </div>

      {scan.greenhouseName ? (
        <p className="mt-3 text-sm">
          Current: <span className="font-medium">{scan.farmName}</span> /{" "}
          <span className="font-medium">{scan.greenhouseName}</span>
          {scan.qrValue ? (
            <span className="ml-2 text-xs text-muted-foreground">QR {scan.qrValue}</span>
          ) : null}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/worker/scan"
          className="inline-flex h-7 items-center rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted"
        >
          Open QR scanner
        </Link>
        <select
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          data-testid="check-in-greenhouse"
          value={manualGh}
          onChange={(e) => setManualGh(e.target.value)}
        >
          <option value="">Quick check-in…</option>
          {BEMACK_DEMO_LOCATIONS.map((l) => (
            <option key={l.greenhouseId} value={l.greenhouseName}>
              {formatStarGreenhouseLabel(l.greenhouseName)}
            </option>
          ))}
        </select>
        <Button
          type="button"
          size="sm"
          disabled={!manualGh}
          onClick={() => checkIn(manualGh)}
        >
          Confirm entrance
        </Button>
      </div>
    </div>
  );
}
