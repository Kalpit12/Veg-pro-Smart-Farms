"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildDemoUnifiedActivityLogs,
  listUnifiedActivityLogs,
  type ActivityLogRow,
  type ActivityLogStatus,
} from "@/services/supabase/activity-log-service";
import { useRealtimeActivityLogs } from "@/hooks/use-realtime-activities";
import { useToast } from "@/hooks/use-toast";
import { AppSelect } from "@/components/ui/app-select";
import { Button } from "@/components/ui/button";
import { ExportExcelButton } from "@/components/export-excel-button";
import { getEvidenceSignedUrl } from "@/services/supabase/storage-service";
import { getDemoActivityLogs } from "@/lib/demo-field-data";
import { activityLogsToExcel, excelFilename } from "@/lib/admin-export-mappers";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { useFieldOpsStore } from "@/store/field-ops-store";
import { useScoutingStore } from "@/store/scouting-store";

export function ActivityLogsTable() {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ActivityLogStatus | "">("");
  const [rows, setRows] = useState<ActivityLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const demoHotspots = useFieldOpsStore((s) => s.demoHotspots);
  const demoSprays = useFieldOpsStore((s) => s.demoSprays);
  const demoScouting = useScoutingStore((s) => s.demoRecords);

  const refresh = useCallback(async () => {
    if (!hasSupabaseEnv()) {
      const merged = buildDemoUnifiedActivityLogs({
        hotspots: demoHotspots,
        sprays: demoSprays,
        scouting: demoScouting,
        legacy: getDemoActivityLogs().map((row) => ({
          id: row.id,
          activity_type: row.activity_type,
          status: row.status as ActivityLogStatus,
          created_at: row.created_at,
          notes: row.notes ?? null,
          image_url: row.image_url ?? null,
          users: row.users,
          farms: row.farms,
          greenhouses: row.greenhouses,
        })),
      });

      let filtered = merged;
      if (status) filtered = filtered.filter((row) => row.status === status);
      if (q) {
        const needle = q.toLowerCase();
        filtered = filtered.filter(
          (row) =>
            row.activity_type.toLowerCase().includes(needle) ||
            (row.notes?.toLowerCase().includes(needle) ?? false) ||
            (row.users?.full_name?.toLowerCase().includes(needle) ?? false) ||
            (row.farms?.name?.toLowerCase().includes(needle) ?? false) ||
            (row.greenhouses?.name?.toLowerCase().includes(needle) ?? false),
        );
      }

      setRows(filtered.slice(0, 100));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await listUnifiedActivityLogs({
        q: q || undefined,
        status: status || undefined,
        limit: 100,
      });
      if (error) throw error;
      setRows(data);
    } catch (e) {
      toast({
        title: "Failed to load logs",
        description: e instanceof Error ? e.message : "Unknown error",
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [q, status, toast, demoHotspots, demoSprays, demoScouting]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useRealtimeActivityLogs(refresh);

  const statusPill = useMemo(
    () => (s: string) => {
      if (s === "approved") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
      if (s === "resolved") return "bg-sky-500/10 text-sky-700 dark:text-sky-300";
      if (s === "rejected") return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
      return "bg-amber-500/10 text-amber-800 dark:text-amber-200";
    },
    [],
  );

  const exportRows = activityLogsToExcel(rows);

  return (
    <div className="space-y-3">
      <div className="glass-card grid gap-2 rounded-2xl p-4 sm:grid-cols-4">
        <input
          className="w-full rounded-lg border border-border bg-background p-3 text-sm"
          placeholder="Search activity, user, farm…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <AppSelect
          aria-label="Activity status"
          value={status}
          onChange={(next) => setStatus(next as ActivityLogStatus | "")}
          options={[
            { value: "", label: "All statuses" },
            { value: "pending", label: "Pending" },
            { value: "approved", label: "Approved" },
            { value: "resolved", label: "Resolved" },
            { value: "rejected", label: "Rejected" },
          ]}
        />
        <Button variant="outline" onClick={refresh}>
          Refresh
        </Button>
        <ExportExcelButton
          rows={exportRows}
          filename={excelFilename("activity-logs")}
          sheetName="Activity logs"
          className="w-full sm:w-auto"
        />
      </div>

      <div className="glass-card mobile-scroll rounded-2xl p-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length ? (
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead>
              <tr className="text-muted-foreground">
                <th className="p-2">Submitted by</th>
                <th className="p-2">Farm</th>
                <th className="p-2">Greenhouse</th>
                <th className="p-2">Activity</th>
                <th className="p-2">Details</th>
                <th className="p-2">Status</th>
                <th className="p-2">Evidence</th>
                <th className="p-2">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/50">
                  <td className="p-2">{row.users?.full_name ?? "—"}</td>
                  <td className="p-2">{row.farms?.name ?? "—"}</td>
                  <td className="p-2">{row.greenhouses?.name ?? "—"}</td>
                  <td className="p-2 font-medium">{row.activity_type}</td>
                  <td className="max-w-xs truncate p-2 text-muted-foreground">
                    {row.notes ?? "—"}
                  </td>
                  <td className="p-2">
                    <span className={`rounded-full px-2 py-1 text-xs capitalize ${statusPill(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="p-2">
                    {row.image_url ? (
                      <button
                        type="button"
                        className="text-xs font-medium underline underline-offset-4"
                        onClick={async () => {
                          try {
                            const url = await getEvidenceSignedUrl(row.image_url!);
                            window.open(url, "_blank", "noopener,noreferrer");
                          } catch (e) {
                            toast({
                              title: "Cannot open evidence",
                              description: e instanceof Error ? e.message : "Unknown error",
                              tone: "error",
                            });
                          }
                        }}
                      >
                        View
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-2">
                    {new Date(row.created_at).toLocaleString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">No matching activities found.</p>
        )}
      </div>
    </div>
  );
}
