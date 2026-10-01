"use client";

import { useCallback, useEffect, useState } from "react";

import { useRealtimeScouting } from "@/hooks/use-realtime-scouting";
import { hasConfiguredBackend } from "@/lib/data-backend";
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

export function useScoutingRounds(limit = 80) {
  const demoRounds = useScoutingStore((s) => s.demoRounds);
  const [remote, setRemote] = useState<UnifiedScoutingRound[]>([]);

  const load = useCallback(async () => {
    if (!hasConfiguredBackend()) return;
    const { data } = await listScoutingRounds(limit);
    setRemote((data as ScoutingRoundRow[] | null)?.map(fromRemoteRound) ?? []);
  }, [limit]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeScouting(load);

  return {
    rounds: hasConfiguredBackend() ? remote : demoRounds.map(fromDemoRound),
    refresh: load,
  };
}

export function useScoutingData(days = 30) {
  const demoRecords = useScoutingStore((s) => s.demoRecords);
  const [remote, setRemote] = useState<UnifiedScoutingRecord[]>([]);
  const [loading, setLoading] = useState(hasConfiguredBackend());

  const load = useCallback(async () => {
    if (!hasConfiguredBackend()) {
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

  const records = hasConfiguredBackend()
    ? remote
    : demoRecords.map(fromDemo);

  return { records, loading, refresh: load };
}

export function useAllScoutingRecords() {
  const demoRecords = useScoutingStore((s) => s.demoRecords);
  const [remote, setRemote] = useState<UnifiedScoutingRecord[]>([]);

  const load = useCallback(async () => {
    if (!hasConfiguredBackend()) return;
    const { data } = await listScoutingRecords(500);
    setRemote((data as ScoutingRecordRow[] | null)?.map(fromRemote) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeScouting(load);

  return hasConfiguredBackend() ? remote : demoRecords.map(fromDemo);
}
