import { createClient } from "@/lib/supabase/client";

export type WorkerOpsRow = {
  workerId: string;
  workerName: string;
  greenhouse: string;
  farm: string;
  workingOn: string;
  problem: string;
  mainIssue: string;
  /** Infestation severity reported by worker (1–5). */
  severity: number;
};

export async function listWorkerOpsRows(): Promise<WorkerOpsRow[]> {
  const supabase = createClient();

  const { data: workers, error: workersError } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("role", "worker");

  if (workersError) throw workersError;
  if (!workers?.length) return [];

  const workerIds = workers.map((w) => w.id);

  const [hotspotsRes, spraysRes, positionsRes] = await Promise.all([
    supabase
      .from("infestation_hotspots")
      .select(
        "id, reported_by, pest_type, problem, main_issue, severity, status, created_at, greenhouses(name), farms(name)",
      )
      .in("reported_by", workerIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("spray_treatments")
      .select(
        "id, worker_id, product_name, created_at, greenhouses(name), farms(name)",
      )
      .in("worker_id", workerIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("worker_positions")
      .select("worker_id, updated_at")
      .in("worker_id", workerIds),
  ]);

  if (hotspotsRes.error) throw hotspotsRes.error;
  if (spraysRes.error) throw spraysRes.error;
  if (positionsRes.error) throw positionsRes.error;

  const rows: WorkerOpsRow[] = workers.map((worker) => {
    const hotspot = hotspotsRes.data?.find((h) => h.reported_by === worker.id);
    const spray = spraysRes.data?.find((s) => s.worker_id === worker.id);
    const hasPosition = positionsRes.data?.some((p) => p.worker_id === worker.id);

    const greenhouse =
      (hotspot?.greenhouses as { name?: string } | null)?.name ??
      (spray?.greenhouses as { name?: string } | null)?.name ??
      "—";
    const farm =
      (hotspot?.farms as { name?: string } | null)?.name ??
      (spray?.farms as { name?: string } | null)?.name ??
      "—";

    let workingOn = hasPosition ? "In field" : "—";
    let problem = "—";
    let mainIssue = "—";
    let severity = 0;

    if (hotspot?.status === "active") {
      workingOn = `Report: ${hotspot.pest_type}`;
      problem = hotspot.problem;
      mainIssue = hotspot.main_issue;
      severity = hotspot.severity ?? 0;
    } else if (spray) {
      workingOn = `Spray: ${spray.product_name}`;
      problem = "Treatment logged";
      mainIssue = "Spray completed";
      severity = 0;
    }

    return {
      workerId: worker.id,
      workerName: worker.full_name,
      greenhouse,
      farm,
      workingOn,
      problem,
      mainIssue,
      severity,
    };
  });

  return rows.sort((a, b) => a.greenhouse.localeCompare(b.greenhouse));
}
