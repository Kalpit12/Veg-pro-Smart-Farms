"use client";

import { useCallback, useEffect, useState } from "react";

import { AppSelect } from "@/components/ui/app-select";
import { Skeleton } from "@/components/ui/skeleton";
import { ExportExcelButton } from "@/components/export-excel-button";
import { useRealtimeHotspots } from "@/hooks/use-realtime-hotspots";
import { useRealtimePositions } from "@/hooks/use-realtime-positions";
import { useDemoRefresh } from "@/hooks/use-demo-refresh";
import { useToast } from "@/hooks/use-toast";
import { getDemoWorkerRows } from "@/lib/demo-field-data";
import { excelFilename, workersToExcel } from "@/lib/admin-export-mappers";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import {
  listWorkerOpsRows,
  type WorkerOpsRow,
} from "@/services/supabase/worker-ops-service";
import { useFieldOpsStore } from "@/store/field-ops-store";

export function WorkersTable() {
  const { toast } = useToast();
  const { tick } = useDemoRefresh();
  const demoHotspots = useFieldOpsStore((s) => s.demoHotspots);
  const [rows, setRows] = useState<WorkerOpsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [greenhouseFilter, setGreenhouseFilter] = useState("all");

  const refresh = useCallback(async () => {
    if (!hasSupabaseEnv()) {
      const liveReports: WorkerOpsRow[] = demoHotspots
        .filter((h) => h.status === "active")
        .map((h) => ({
          workerId: h.reported_by,
          workerName: h.users?.full_name ?? "Field worker",
          greenhouse: h.greenhouses?.name ?? "—",
          farm: h.farms?.name ?? "—",
          workingOn: `Report: ${h.pest_type}`,
          problem: h.problem,
          mainIssue: h.main_issue,
          severity: h.severity,
        }));
      const staticRows = getDemoWorkerRows();
      setRows([...liveReports, ...staticRows]);
      setLoading(false);
      return;
    }

    try {
      const data = await listWorkerOpsRows();
      setRows(data);
    } catch (e) {
      toast({
        title: "Workers list unavailable",
        description: e instanceof Error ? e.message : "Unknown error",
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, demoHotspots]);

  useEffect(() => {
    void refresh();
  }, [refresh, tick]);

  useRealtimeHotspots(refresh);
  useRealtimePositions(refresh);

  const greenhouses = ["all", ...new Set(rows.map((r) => r.greenhouse).filter((g) => g !== "—"))];
  const filtered =
    greenhouseFilter === "all"
      ? rows
      : rows.filter((r) => r.greenhouse === greenhouseFilter);

  const grouped = filtered.reduce<Record<string, WorkerOpsRow[]>>((acc, row) => {
    const key = row.greenhouse;
    acc[key] = acc[key] ?? [];
    acc[key].push(row);
    return acc;
  }, {});

  const exportRows = workersToExcel(filtered);

  if (loading) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex min-w-[12rem] flex-col gap-1 text-sm font-medium sm:flex-row sm:items-center">
          Greenhouse
          <AppSelect
            aria-label="Greenhouse"
            className="sm:ml-2 sm:min-w-[12rem]"
            size="sm"
            align="start"
            value={greenhouseFilter}
            onChange={setGreenhouseFilter}
            options={greenhouses.map((g) => ({
              value: g,
              label: g === "all" ? "All" : g,
            }))}
          />
        </label>
        <ExportExcelButton
          rows={exportRows}
          filename={excelFilename("workers")}
          sheetName="Workers"
        />
      </div>

      {Object.entries(grouped).map(([gh, groupRows]) => (
        <div key={gh} className="glass-card overflow-hidden rounded-2xl">
          <h3 className="border-b border-border/70 bg-muted/30 px-4 py-3 text-sm font-semibold">
            {gh}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border/70 text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Worker</th>
                  <th className="px-4 py-2 font-medium">Working on</th>
                  <th className="px-4 py-2 font-medium">Problem</th>
                  <th className="px-4 py-2 font-medium">Main issue</th>
                  <th className="px-4 py-2 font-medium">Severity</th>
                </tr>
              </thead>
              <tbody>
                {groupRows.map((row) => (
                  <tr key={row.workerId} className="border-b border-border/50">
                    <td className="px-4 py-3 font-medium">{row.workerName}</td>
                    <td className="px-4 py-3">{row.workingOn}</td>
                    <td className="px-4 py-3">{row.problem}</td>
                    <td className="px-4 py-3">{row.mainIssue}</td>
                    <td className="px-4 py-3">
                      {row.severity > 0 ? `${row.severity}/5` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {!filtered.length ? (
        <p className="text-sm text-muted-foreground">No workers to show.</p>
      ) : null}
    </section>
  );
}
