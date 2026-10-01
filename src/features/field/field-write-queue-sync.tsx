"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useToast } from "@/hooks/use-toast";
import {
  blobToFile,
  deleteEvidenceBlob,
  getEvidenceBlob,
} from "@/lib/offline-evidence-store";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import {
  reportInfestation,
  updateHotspotAfterSpray,
} from "@/services/supabase/infestation-service";
import { createScoutingRecord } from "@/services/supabase/scouting-service";
import { startScoutingRound } from "@/services/supabase/scouting-round-service";
import { finalizeRoundMetrics } from "@/services/supabase/scouting-route-service";
import { logSpray } from "@/services/supabase/spray-service";
import {
  uploadActivityEvidence,
  uploadScoutingEvidence,
} from "@/services/supabase/storage-service";
import {
  isLikelyOfflineError,
  useFieldWriteQueueStore,
  type FieldQueuedWrite,
} from "@/store/field-write-queue-store";
import { useScoutingRouteBufferStore } from "@/store/scouting-route-buffer-store";

async function flushQueuedItem(item: FieldQueuedWrite) {
  if (item.kind === "round_start") {
    return startScoutingRound({
      id: item.payload.id,
      scout_id: item.payload.scout_id,
      farm_id: item.payload.farm_id,
      greenhouse_id: item.payload.greenhouse_id,
      started_at: item.payload.started_at,
    });
  }

  if (item.kind === "round_finish") {
    const roundId = item.payload.round_id;
    const unsynced = useScoutingRouteBufferStore.getState().getUnsynced(roundId);
    if (unsynced.length) {
      const { appendRoutePoints } = await import(
        "@/services/supabase/scouting-route-service"
      );
      const batchSize = 12;
      for (let i = 0; i < unsynced.length; i += batchSize) {
        const batch = unsynced.slice(i, i + batchSize);
        const { error } = await appendRoutePoints(
          roundId,
          batch.map((p) => ({
            latitude: p.latitude,
            longitude: p.longitude,
            accuracy_m: p.accuracyM,
            recorded_at: p.recordedAt,
          })),
        );
        if (error) return { data: null, error };
        useScoutingRouteBufferStore.getState().markSynced(batch.map((p) => p.id));
      }
    }
    return finalizeRoundMetrics(roundId, {
      coveragePct: item.payload.coveragePct,
    });
  }

  if (item.kind === "scout") {
    let payload = item.payload;
    if (item.pendingPhoto) {
      const stored = await getEvidenceBlob(item.pendingPhoto.blobKey);
      if (stored) {
        const file = blobToFile(
          stored.blob,
          stored.fileName,
          stored.contentType,
        );
        const path = await uploadScoutingEvidence(file);
        payload = { ...payload, image_url: path };
        await deleteEvidenceBlob(item.pendingPhoto.blobKey);
      }
    }
    return createScoutingRecord(payload);
  }

  if (item.kind === "infestation") {
    return reportInfestation(item.payload);
  }

  let sprayPayload = item.payload;
  if (item.pendingPhoto) {
    const stored = await getEvidenceBlob(item.pendingPhoto.blobKey);
    if (stored) {
      const file = blobToFile(stored.blob, stored.fileName, stored.contentType);
      const path = await uploadActivityEvidence(file);
      sprayPayload = { ...sprayPayload, image_url: path };
      await deleteEvidenceBlob(item.pendingPhoto.blobKey);
    }
  }

  const sprayResult = await logSpray(sprayPayload);
  if (sprayResult.error) return sprayResult;

  if (item.markHotspotSprayed && item.payload.hotspot_id) {
    const statusResult = await updateHotspotAfterSpray(item.payload.hotspot_id, {
      severityAfter: item.payload.severity_after ?? null,
    });
    if (statusResult.error) return statusResult;
  }

  return sprayResult;
}

export function FieldWriteQueueSync() {
  const items = useFieldWriteQueueStore((s) => s.items);
  const remove = useFieldWriteQueueStore((s) => s.remove);
  const { toast } = useToast();
  const [flushing, setFlushing] = useState(false);
  const [flushError, setFlushError] = useState<string | null>(null);
  const flushingRef = useRef(false);

  const flush = useCallback(async () => {
    if (!hasSupabaseEnv()) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    if (flushingRef.current) return;
    const pending = useFieldWriteQueueStore.getState().items;
    if (!pending.length) return;
    flushingRef.current = true;
    setFlushing(true);
    let sent = 0;
    try {
      for (const item of pending) {
        try {
          const result = await flushQueuedItem(item);
          if (result.error) {
            if (isLikelyOfflineError(result.error)) {
              setFlushError(null);
              break;
            }
            const err = result.error;
            const message = err instanceof Error ? err.message : String(err);
            setFlushError(message);
            toast({
              title: "Queued field write could not sync",
              description: message,
              tone: "error",
            });
            break;
          }
          remove(item.id);
          sent += 1;
          setFlushError(null);
        } catch (e) {
          if (isLikelyOfflineError(e)) {
            setFlushError(null);
            break;
          }
          const message = e instanceof Error ? e.message : String(e);
          setFlushError(message);
          toast({
            title: "Queued field write could not sync",
            description: message,
            tone: "error",
          });
          break;
        }
      }
      if (sent) {
        toast({
          title: "Queued field reports synced",
          description: `${sent} saved after reconnecting.`,
          tone: "success",
        });
      }
    } finally {
      flushingRef.current = false;
      setFlushing(false);
    }
  }, [remove, toast]);

  useEffect(() => {
    void flush();
    const onOnline = () => void flush();
    window.addEventListener("online", onOnline);
    const id = window.setInterval(() => void flush(), 20_000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.clearInterval(id);
    };
  }, [flush]);

  if (!items.length) return null;

  return (
    <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
      {items.length} field report{items.length === 1 ? "" : "s"} (scouting, infestation,
      spray, or round) waiting for signal. They will send automatically when you are
      online
      {flushing ? " — sending now…" : "."}
      {flushError ? ` Last error: ${flushError}` : ""}
    </p>
  );
}
