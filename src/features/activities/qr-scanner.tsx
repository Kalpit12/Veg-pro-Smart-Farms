"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { BEMACK_DEMO_LOCATIONS } from "@/lib/bemack-master-data";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { resolveQrValue } from "@/services/supabase/qr-service";
import { useScanStore } from "@/store/scan-store";
import { useToast } from "@/hooks/use-toast";

export function QrScanner() {
  const [value, setValue] = useState<string>("No QR scanned yet.");
  const [resolving, setResolving] = useState(false);
  const [running, setRunning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const setContext = useScanStore((s) => s.setContext);
  const ctx = useScanStore();
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        void scannerRef.current.stop().catch(() => undefined);
      }
    };
  }, []);

  const getQrBoxSize = () => {
    if (typeof window === "undefined") return 240;
    return Math.min(280, Math.max(180, window.innerWidth - 64));
  };

  const start = async () => {
    if (running) return;
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;
    await scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: getQrBoxSize() },
      (decodedText) => setValue(decodedText),
      () => undefined,
    );
    setRunning(true);
  };

  const stop = async () => {
    await scannerRef.current?.stop();
    setRunning(false);
  };

  return (
    <div className="glass-card space-y-3 rounded-2xl p-4">
      <h2 className="text-lg font-semibold">Scan greenhouse QR</h2>

      {!hasSupabaseEnv() ? (
        <div className="space-y-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
          <p className="text-xs font-medium text-muted-foreground">Demo — skip camera</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[0, 2, 3].map((i) => {
              const loc = BEMACK_DEMO_LOCATIONS[i];
              return (
                <Button
                  key={loc.greenhouseId}
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setValue(loc.qrValue);
                    setContext({
                      qrValue: loc.qrValue,
                      farmId: loc.farmId,
                      greenhouseId: loc.greenhouseId,
                      farmName: loc.farmName,
                      greenhouseName: loc.greenhouseName,
                      assignmentLocked: true,
                    });
                    toast({
                      title: "Star location set",
                      description: `${loc.farmName} / ${loc.greenhouseName}`,
                      tone: "success",
                    });
                  }}
                >
                  {loc.greenhouseName}
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div id="qr-reader" className="min-h-56 w-full overflow-hidden rounded-xl bg-muted/40 p-2" />
      <p className="text-sm text-muted-foreground">Scanned value: {value}</p>
      <div className="rounded-xl bg-background/60 p-3 text-sm">
        <p className="text-xs text-muted-foreground">Resolved context</p>
        <p className="mt-1">
          Farm: <span className="font-semibold">{ctx.farmName ?? "—"}</span>
        </p>
        <p>
          Greenhouse: <span className="font-semibold">{ctx.greenhouseName ?? "—"}</span>
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button type="button" onClick={start}>
          Start scan
        </Button>
        <Button type="button" variant="outline" onClick={stop}>
          Stop scan
        </Button>
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={resolving || !value || value === "No QR scanned yet."}
        onClick={async () => {
          try {
            setResolving(true);
            if (!hasSupabaseEnv()) {
              const bemack = BEMACK_DEMO_LOCATIONS.find(
                (l) => l.qrValue === value || value.includes("BEMACK"),
              );
              const farm = bemack ?? BEMACK_DEMO_LOCATIONS[0];
              const resolved =
                BEMACK_DEMO_LOCATIONS.find((l) => value.includes(l.greenhouseName.replace(/\s/g, ""))) ??
                BEMACK_DEMO_LOCATIONS.find((l) => value.includes(l.greenhouseName)) ??
                farm;
              setContext({
                qrValue: value,
                farmId: resolved.farmId,
                greenhouseId: resolved.greenhouseId,
                farmName: resolved.farmName,
                greenhouseName: resolved.greenhouseName,
                assignmentLocked: true,
              });
              toast({
                title: "Demo context resolved",
                description: `${resolved.farmName} / ${resolved.greenhouseName}`,
                tone: "success",
              });
              return;
            }
            const resolved = await resolveQrValue(value);
            if (!resolved) {
              toast({
                title: "QR not recognized",
                description: "No matching farm/greenhouse found for this QR value.",
                tone: "error",
              });
              return;
            }
            setContext({
              qrValue: resolved.qr_value,
              farmId: resolved.farm_id,
              greenhouseId: resolved.greenhouse_id,
              farmName: resolved.farm_name,
              greenhouseName: resolved.greenhouse_name,
              assignmentLocked: true,
            });
            toast({
              title: "Context resolved",
              description: `${resolved.farm_name ?? "Farm"} • ${resolved.greenhouse_name ?? "Greenhouse"}`,
              tone: "success",
            });
          } catch (e) {
            toast({
              title: "Failed to resolve QR",
              description: e instanceof Error ? e.message : "Unknown error",
              tone: "error",
            });
          } finally {
            setResolving(false);
          }
        }}
      >
        {resolving ? "Resolving…" : "Resolve QR to farm"}
      </Button>
    </div>
  );
}
