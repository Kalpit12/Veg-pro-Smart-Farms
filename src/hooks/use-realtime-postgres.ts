"use client";

import { useEffect, useId, useRef } from "react";

import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/config";

type RealtimeTable = {
  schema?: string;
  table: string;
};

/** One channel per hook instance — avoids "callbacks after subscribe()" when names collide. */
export function useRealtimePostgres(
  prefix: string,
  tables: RealtimeTable[],
  onChange: () => void,
) {
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!hasSupabaseEnv()) return;

    const supabase = createClient();
    let channel = supabase.channel(`${prefix}-${instanceId}`);

    for (const { schema = "public", table } of tables) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema, table },
        () => onChangeRef.current(),
      );
    }

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [prefix, instanceId, tables]);
}
