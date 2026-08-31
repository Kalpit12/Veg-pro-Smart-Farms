"use client";

import { useCallback, useEffect, useState } from "react";

import { useRealtimeScouting } from "@/hooks/use-realtime-scouting";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { SprayProgramInput } from "@/lib/spray-work-program";
import {
  listScoutingRecords,
  listScoutingRecordsSince,
  type ScoutingRecordRow,
} from "@/services/supabase/scouting-service";
import { useScoutingStore, type DemoScoutingRecord } from "@/store/scouting-store";
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
  };
}

function fromRemote(r: ScoutingRecordRow): UnifiedScoutingRecord {
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

export function useScoutingData(days = 30) {
  const demoRecords = useScoutingStore((s) => s.demoRecords);
  const [remote, setRemote] = useState<UnifiedScoutingRecord[]>([]);
  const [loading, setLoading] = useState(hasSupabaseEnv());

  const load = useCallback(async () => {
    if (!hasSupabaseEnv()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - days);
    const { data } = await listScoutingRecordsSince(since);
    setRemote((data as ScoutingRecordRow[] | null)?.map(fromRemote) ?? []);
    setLoading(false);
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeScouting(load);

  const records = hasSupabaseEnv()
    ? remote
    : demoRecords.map(fromDemo);

  return { records, loading, refresh: load };
}

export function useAllScoutingRecords() {
  const demoRecords = useScoutingStore((s) => s.demoRecords);
  const [remote, setRemote] = useState<UnifiedScoutingRecord[]>([]);

  const load = useCallback(async () => {
    if (!hasSupabaseEnv()) return;
    const { data } = await listScoutingRecords(500);
    setRemote((data as ScoutingRecordRow[] | null)?.map(fromRemote) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeScouting(load);

  return hasSupabaseEnv() ? remote : demoRecords.map(fromDemo);
}
