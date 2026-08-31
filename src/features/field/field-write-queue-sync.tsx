"use client";

import { useCallback, useEffect, useState } from "react";

import { useToast } from "@/hooks/use-toast";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { reportInfestation } from "@/services/supabase/infestation-service";
import { createScoutingRecord } from "@/services/supabase/scouting-service";
import { useFieldWriteQueueStore } from "@/store/field-write-queue-store";

export function FieldWriteQueueSync() {
  const items = useFieldWriteQueueStore((s) => s.items);
  const remove = useFieldWriteQueueStore((s) => s.remove);
  const { toast } = useToast();
  const [flushing, setFlushing] = useState(false);

  const flush = useCallback(async () => {
    if (!hasSupabaseEnv()) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    if (flushing) return;
    const pending = useFieldWriteQueueStore.getState().items;
    if (!pending.length) return;
    setFlushing(true);
    let sent = 0;
    try {
      for (const item of pending) {
        if (item.kind === "scout") {
          const { error } = await createScoutingRecord(item.payload);
          if (error) break;
        } else {
          const { error } = await reportInfestation(item.payload);
          if (error) break;
        }
        remove(item.id);
        sent += 1;
      }
      if (sent) {
        toast({
          title: "Queued field reports synced",
          description: `${sent} saved after reconnecting.`,
          tone: "success",
        });
      }
    } finally {
      setFlushing(false);
    }
  }, [flushing, remove, toast]);

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
      {items.length} scouting/infestation report{items.length === 1 ? "" : "s"} waiting for
      signal. They will send automatically when you are online
      {flushing ? " — sending now…" : "."}
    </p>
  );
}
