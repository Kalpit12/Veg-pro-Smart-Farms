"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { MssqlPollOptions } from "@/hooks/use-mssql-poll";

import { useRealtimeScouting } from "@/hooks/use-realtime-scouting";
import { hasConfiguredBackend } from "@/lib/data-backend";
import { isBrowserOffline, isLikelyOfflineError } from "@/lib/network-errors";
import { SCOUTING_DATA_CHANGED_EVENT } from "@/lib/scouting-data-events";
import type { SprayProgramInput } from "@/lib/spray-work-program";
import {
  listScoutingRecords,
  listScoutingRecordsSince,
  type ScoutingRecordRow,
} from "@/services/supabase/scouting-service";
import {
  listScoutingRounds,
  type ScoutingRoundRow,
} from "@/services/supabase/scouting-round-service";
import { useScoutingStore, type DemoScoutingRecord, type DemoScoutingRound } from "@/store/scouting-store";
import type { ScoutingIssueType } from "@/types/db";

export type UnifiedScoutingRecord = {
  id: string;
  roundId: string | null;
  scoutName: string;
  farmName: string;
  greenhouseName: string;
  greenhouseId: string;
  category: string;
  variety: string;
  beds: number;
  columnNo: number;
  bayNo: number;
  issueType: ScoutingIssueType;
  issue: string;
  rating: number | null;
  recordedAt: string;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
};

function fromDemo(r: DemoScoutingRecord): UnifiedScoutingRecord {
  return {
    id: r.id,
    roundId: r.roundId ?? null,
    scoutName: r.scoutName,
    farmName: r.farmName,
    greenhouseName: r.greenhouseName,
    greenhouseId: r.greenhouseId,
    category: r.category,
    variety: r.variety,
    beds: r.beds,
    columnNo: r.columnNo,
    bayNo: r.bayNo,
    issueType: r.issueType,
    issue: r.issue,
    rating: r.rating,
    recordedAt: r.recordedAt,
    latitude: r.latitude,
    longitude: r.longitude,
    imageUrl: r.imageUrl ?? null,
  };
}

export function unifiedFromScoutingRecordRow(r: ScoutingRecordRow): UnifiedScoutingRecord {
  return {
    id: r.id,
    roundId: r.round_id ?? null,
    scoutName: r.users?.full_name ?? "Scout",
    farmName: r.farms?.name ?? "—",
    greenhouseName: r.greenhouses?.name ?? "—",
    greenhouseId: r.greenhouse_id,
    category: r.crop_categories?.name ?? "—",
    variety: r.crop_varieties?.name ?? "—",
    beds: r.beds,
    columnNo: r.column_no,
    bayNo: r.bay_no,
    issueType: r.issue_type,
    issue: r.issue_name,
    rating: r.rating,
    recordedAt: r.recorded_at,
    latitude: r.latitude,
    longitude: r.longitude,
    imageUrl: r.image_url ?? null,
  };
}

export function toSprayInput(r: UnifiedScoutingRecord): SprayProgramInput {
  return {
    id: r.id,
    greenhouseName: r.greenhouseName,
    variety: r.variety,
    issueType: r.issueType,
    issue: r.issue,
    rating: r.rating,
    columnNo: r.columnNo,
    bayNo: r.bayNo,
    beds: r.beds,
    recordedAt: r.recordedAt,
  };
}

export type UnifiedScoutingRound = {
  id: string;
  scoutName: string;
  farmId: string;
  greenhouseName: string;
  greenhouseId: string;
  startedAt: string;
  endedAt: string | null;
  status: "active" | "completed";
  stopCount: number;
  distanceM: number;
  durationS: number | null;
  coveragePct: number | null;
};

function fromDemoRound(r: DemoScoutingRound): UnifiedScoutingRound {
  return {
    id: r.id,
    scoutName: r.scoutName,
    farmId: r.farmId,
    greenhouseName: r.greenhouseName,
    greenhouseId: r.greenhouseId,
    startedAt: r.startedAt,
    endedAt: r.endedAt ?? null,
    status: r.status,
    stopCount: r.stopCount,
    distanceM: r.distanceM ?? 0,
    durationS: r.durationS ?? null,
    coveragePct: r.coveragePct ?? null,
  };
}

function fromRemoteRound(r: ScoutingRoundRow): UnifiedScoutingRound {
  return {
    id: r.id,
    scoutName: r.users?.full_name ?? "Scout",
    farmId: r.farm_id,
    greenhouseName: r.greenhouses?.name ?? "—",
    greenhouseId: r.greenhouse_id,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    status: r.status,
    stopCount: r.stop_count,
    distanceM: r.distance_m ?? 0,
    durationS: r.duration_s,
    coveragePct: r.coverage_pct,
  };
}

export function useScoutingRounds(limit = 80, options?: Pick<MssqlPollOptions, "enabled">) {
  const demoRounds = useScoutingStore((s) => s.demoRounds);
  const [remote, setRemote] = useState<UnifiedScoutingRound[]>([]);
  const poll = options?.enabled ?? true;

  const load = useCallback(async () => {
    if (!hasConfiguredBackend()) return;
    const { data } = await listScoutingRounds(limit);
    setRemote((data as ScoutingRoundRow[] | null)?.map(fromRemoteRound) ?? []);
  }, [limit]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeScouting(load, { enabled: poll });

  return {
    rounds: hasConfiguredBackend() ? remote : demoRounds.map(fromDemoRound),
    refresh: load,
  };
}

const SCOUTING_CACHE_PREFIX = "vegpro-scouting-records-cache-";

/** Last records loaded online, so the field heat grid still has data offline. */
function readScoutingCache(key: string): UnifiedScoutingRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as UnifiedScoutingRecord[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeScoutingCache(key: string, rows: UnifiedScoutingRecord[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(rows.slice(0, 800)));
  } catch {
    /* quota / private mode — offline cache is best effort */
  }
}

export function useScoutingData(
  days = 30,
  options?: Pick<MssqlPollOptions, "enabled"> & { recordLimit?: number },
) {
  const demoRecords = useScoutingStore((s) => s.demoRecords);
  const [remote, setRemote] = useState<UnifiedScoutingRecord[]>([]);
  const [loading, setLoading] = useState(hasConfiguredBackend());
  const initialLoad = useRef(true);
  const poll = options?.enabled ?? true;
  const recordLimit = options?.recordLimit ?? 800;

  const load = useCallback(async () => {
    if (!hasConfiguredBackend()) {
      setLoading(false);
      return;
    }
    if (initialLoad.current) {
      setLoading(true);
    }
    const since = new Date();
    since.setDate(since.getDate() - days);
    const cacheKey = `${SCOUTING_CACHE_PREFIX}${days}`;
    if (isBrowserOffline()) {
      // No signal: show the last records loaded online, skip the server call.
      setRemote((prev) => (prev.length ? prev : readScoutingCache(cacheKey)));
      setLoading(false);
      initialLoad.current = false;
      return;
    }
    try {
      const { data, error } = await listScoutingRecordsSince(since, recordLimit);
      if (error) {
        if (isLikelyOfflineError(error)) {
          // Offline: keep showing the last records we loaded.
          setRemote((prev) => (prev.length ? prev : readScoutingCache(cacheKey)));
        } else {
          console.error("[scouting-data]", error.message);
          setRemote([]);
        }
      } else {
        const rows =
          (data as ScoutingRecordRow[] | null)?.map(unifiedFromScoutingRecordRow) ?? [];
        setRemote(rows);
        writeScoutingCache(cacheKey, rows);
      }
    } catch (e) {
      // Server action unreachable (no signal): never leave the grid stuck on "Loading…".
      if (!isLikelyOfflineError(e)) console.error("[scouting-data]", e);
      setRemote((prev) => (prev.length ? prev : readScoutingCache(cacheKey)));
    } finally {
      setLoading(false);
      initialLoad.current = false;
    }
  }, [days, recordLimit]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onChanged = () => void load();
    window.addEventListener(SCOUTING_DATA_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(SCOUTING_DATA_CHANGED_EVENT, onChanged);
  }, [load]);

  useRealtimeScouting(load, { enabled: poll });

  const records = hasConfiguredBackend()
    ? remote
    : demoRecords.map(fromDemo);

  return { records, loading, refresh: load };
}

export function useAllScoutingRecords() {
  const demoRecords = useScoutingStore((s) => s.demoRecords);
  const [remote, setRemote] = useState<UnifiedScoutingRecord[]>([]);

  const load = useCallback(async () => {
    if (!hasConfiguredBackend() || isBrowserOffline()) return;
    try {
      const { data, error } = await listScoutingRecords(500);
      if (error && isLikelyOfflineError(error)) return; // offline: keep what we have
      setRemote((data as ScoutingRecordRow[] | null)?.map(unifiedFromScoutingRecordRow) ?? []);
    } catch {
      /* offline — keep previous records */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeScouting(load);

  return hasConfiguredBackend() ? remote : demoRecords.map(fromDemo);
}
