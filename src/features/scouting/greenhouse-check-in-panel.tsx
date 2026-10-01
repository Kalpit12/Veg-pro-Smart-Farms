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

  const checkedIn = Boolean(
    scan.farmId && scan.greenhouseId && (scan.assignmentLocked || scan.qrValue),
  );

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
    <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <QrCode className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">Greenhouse check-in</p>
            <p className="text-xs text-muted-foreground">
              Scan entrance QR/NFC or confirm the house before starting a route.
            </p>
          </div>
        </div>
        {checkedIn ? (
          <Badge variant="success" className="shrink-0 gap-1">
            <CheckCircle2 className="size-3" />
            Checked in
          </Badge>
        ) : (
          <Badge variant="outline" className="shrink-0">
            Not verified
          </Badge>
        )}
      </div>

      {scan.greenhouseName ? (
        <p className="mt-3 break-words text-sm">
          Current: <span className="font-medium">{scan.farmName}</span> /{" "}
          <span className="font-medium">{scan.greenhouseName}</span>
          {scan.qrValue ? (
            <span className="mt-1 block text-xs text-muted-foreground sm:mt-0 sm:ml-2 sm:inline">
              QR {scan.qrValue}
            </span>
          ) : null}
        </p>
      ) : null}

      <div className="mt-3 flex min-w-0 flex-col gap-2">
        <Link
          href="/worker/scan"
          className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted"
        >
          Open QR scanner
        </Link>
        <select
          className="h-9 w-full min-w-0 max-w-full rounded-lg border border-border bg-background px-3 text-sm"
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
          className="w-full"
          disabled={!manualGh}
          onClick={() => checkIn(manualGh)}
        >
          Confirm entrance
        </Button>
      </div>
    </div>
  );
}
