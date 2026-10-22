import bcrypt from "bcryptjs";

import { roundQualityFlags, type WorkerHistoryEvent } from "@/lib/worker-trends";
import { fail, ok, toIso } from "@/lib/mssql/result";
import { requireServerSession } from "@/lib/mssql/session-server";
import { getMssqlPool, sql } from "@/lib/mssql/pool";
import type { WorkerOpsRow } from "@/services/supabase/worker-ops-service";

export async function mssqlListWorkerOpsRows() {
  try {
    await requireServerSession();
    const pool = await getMssqlPool();
    const workers = await pool.request().query(`
      SELECT id, full_name FROM dbo.users WHERE role = N'worker' ORDER BY full_name
    `);
    if (!workers.recordset.length) return ok([] as WorkerOpsRow[]);

    const workerIds = workers.recordset.map((r) => String(r.id));
    const inList = workerIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(",");

    const [hotspots, sprays, positions] = await Promise.all([
      pool.request().query(`
        SELECT h.reported_by, h.pest_type, h.problem, h.main_issue, h.severity, h.status, h.created_at,
               g.name AS greenhouse_name, f.name AS farm_name
        FROM dbo.infestation_hotspots h
        LEFT JOIN dbo.greenhouses g ON g.id = h.greenhouse_id
        LEFT JOIN dbo.farms f ON f.id = h.farm_id
        WHERE h.reported_by IN (${inList})
        ORDER BY h.created_at DESC
      `),
      pool.request().query(`
        SELECT s.worker_id, s.product_name, s.created_at, g.name AS greenhouse_name, f.name AS farm_name
        FROM dbo.spray_treatments s
        LEFT JOIN dbo.greenhouses g ON g.id = s.greenhouse_id
        LEFT JOIN dbo.farms f ON f.id = s.farm_id
        WHERE s.worker_id IN (${inList})
        ORDER BY s.created_at DESC
      `),
      pool.request().query(`
        SELECT worker_id, updated_at FROM dbo.worker_positions WHERE worker_id IN (${inList})
      `),
    ]);

    const rows: WorkerOpsRow[] = workers.recordset.map((worker) => {
      const id = String(worker.id);
      const hotspot = hotspots.recordset.find((h) => String(h.reported_by) === id);
      const spray = sprays.recordset.find((s) => String(s.worker_id) === id);
      const hasPosition = positions.recordset.some((p) => String(p.worker_id) === id);

      const greenhouse =
        (hotspot?.greenhouse_name as string | undefined) ??
        (spray?.greenhouse_name as string | undefined) ??
        "—";
      const farm =
        (hotspot?.farm_name as string | undefined) ??
        (spray?.farm_name as string | undefined) ??
        "—";

      let workingOn = hasPosition ? "In field" : "—";
      let problem = "—";
      let mainIssue = "—";
      let severity = 0;

      if (hotspot?.status === "active") {
        workingOn = `Report: ${hotspot.pest_type as string}`;
        problem = hotspot.problem as string;
        mainIssue = hotspot.main_issue as string;
        severity = Number(hotspot.severity ?? 0);
      } else if (spray) {
        workingOn = `Spray: ${spray.product_name as string}`;
        problem = "Treatment logged";
        mainIssue = "Spray completed";
      }

      return {
        workerId: id,
        workerName: worker.full_name as string,
        greenhouse,
        farm,
        workingOn,
        problem,
        mainIssue,
        severity,
      };
    });

    rows.sort((a, b) => a.greenhouse.localeCompare(b.greenhouse));
    return ok(rows);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not load workers.");
  }
}

export async function mssqlListWorkerTrendsSince(since: Date) {
  try {
    await requireServerSession();
    const pool = await getMssqlPool();
    const workersRes = await pool.request().query(`
      SELECT id, full_name FROM dbo.users WHERE role = N'worker' ORDER BY full_name
    `);
    const workers = workersRes.recordset.map((r) => ({
      id: String(r.id),
      full_name: r.full_name as string,
    }));
    if (!workers.length) {
      return ok({ workers: [], events: [] as WorkerHistoryEvent[] });
    }

    const workerIds = workers.map((w) => w.id);
    const inList = workerIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(",");
    const [hotspots, sprays, scouting, rounds] = await Promise.all([
      pool
        .request()
        .input("since", sql.DateTime2, since)
        .query(`
        SELECT h.id, h.reported_by, h.pest_type, h.problem, h.main_issue, h.severity, h.status,
               h.created_at, h.greenhouse_id, g.name AS greenhouse_name, f.name AS farm_name,
               u.full_name AS reporter_name
        FROM dbo.infestation_hotspots h
        LEFT JOIN dbo.greenhouses g ON g.id = h.greenhouse_id
        LEFT JOIN dbo.farms f ON f.id = h.farm_id
        LEFT JOIN dbo.users u ON u.id = h.reported_by
        WHERE h.reported_by IN (${inList}) AND h.created_at >= @since
        ORDER BY h.created_at DESC
      `),
      pool
        .request()
        .input("since", sql.DateTime2, since)
        .query(`
        SELECT s.id, s.worker_id, s.product_name, s.created_at, s.greenhouse_id,
               g.name AS greenhouse_name, f.name AS farm_name, u.full_name AS worker_name
        FROM dbo.spray_treatments s
        LEFT JOIN dbo.greenhouses g ON g.id = s.greenhouse_id
        LEFT JOIN dbo.farms f ON f.id = s.farm_id
        LEFT JOIN dbo.users u ON u.id = s.worker_id
        WHERE s.worker_id IN (${inList}) AND s.created_at >= @since
        ORDER BY s.created_at DESC
      `),
      pool
        .request()
        .input("since", sql.DateTime2, since)
        .query(`
        SELECT r.id, r.scout_id, r.issue_type, r.issue_name, r.rating, r.recorded_at, r.greenhouse_id,
               g.name AS greenhouse_name, f.name AS farm_name, u.full_name AS scout_name
        FROM dbo.scouting_records r
        LEFT JOIN dbo.greenhouses g ON g.id = r.greenhouse_id
        LEFT JOIN dbo.farms f ON f.id = r.farm_id
        LEFT JOIN dbo.users u ON u.id = r.scout_id
        WHERE r.scout_id IN (${inList}) AND r.recorded_at >= @since
        ORDER BY r.recorded_at DESC
      `),
      pool
        .request()
        .input("since", sql.DateTime2, since)
        .query(`
        SELECT r.id, r.scout_id, r.greenhouse_id, r.status, r.started_at, r.ended_at, r.stop_count,
               r.distance_m, r.duration_s, r.point_count, r.coverage_pct,
               g.name AS greenhouse_name, f.name AS farm_name, u.full_name AS scout_name
        FROM dbo.scouting_rounds r
        LEFT JOIN dbo.greenhouses g ON g.id = r.greenhouse_id
        LEFT JOIN dbo.farms f ON f.id = r.farm_id
        LEFT JOIN dbo.users u ON u.id = r.scout_id
        WHERE r.scout_id IN (${inList}) AND r.started_at >= @since
        ORDER BY r.started_at DESC
      `),
    ]);

    const events: WorkerHistoryEvent[] = [];

    for (const h of hotspots.recordset) {
      const workerId = String(h.reported_by);
      events.push({
        id: `report-${h.id}`,
        workerId,
        workerName:
          (h.reporter_name as string) ??
          workers.find((w) => w.id === workerId)?.full_name ??
          "Worker",
        kind: "infestation_report",
        title: h.pest_type as string,
        detail: (h.problem as string) ?? (h.main_issue as string) ?? null,
        occurredAt: toIso(h.created_at),
        farmName: (h.farm_name as string) ?? null,
        greenhouseId: h.greenhouse_id ? String(h.greenhouse_id) : null,
        greenhouseName: (h.greenhouse_name as string) ?? null,
        severity: h.severity != null ? Number(h.severity) : null,
        status: h.status as string,
      });
    }

    for (const s of sprays.recordset) {
      const workerId = String(s.worker_id);
      events.push({
        id: `spray-${s.id}`,
        workerId,
        workerName:
          (s.worker_name as string) ??
          workers.find((w) => w.id === workerId)?.full_name ??
          "Worker",
        kind: "spray",
        title: s.product_name as string,
        detail: "Spray treatment logged",
        occurredAt: toIso(s.created_at),
        farmName: (s.farm_name as string) ?? null,
        greenhouseId: s.greenhouse_id ? String(s.greenhouse_id) : null,
        greenhouseName: (s.greenhouse_name as string) ?? null,
        severity: null,
        status: null,
      });
    }

    for (const r of scouting.recordset) {
      const workerId = String(r.scout_id);
      events.push({
        id: `scout-${r.id}`,
        workerId,
        workerName:
          (r.scout_name as string) ??
          workers.find((w) => w.id === workerId)?.full_name ??
          "Scout",
        kind: "scouting_stop",
        title: r.issue_name as string,
        detail: `${r.issue_type as string}${r.rating != null ? ` · rating ${r.rating}/5` : ""}`,
        occurredAt: toIso(r.recorded_at),
        farmName: (r.farm_name as string) ?? null,
        greenhouseId: r.greenhouse_id ? String(r.greenhouse_id) : null,
        greenhouseName: (r.greenhouse_name as string) ?? null,
        severity: r.rating != null ? Number(r.rating) : null,
        status: null,
      });
    }

    for (const round of rounds.recordset) {
      const workerId = String(round.scout_id);
      const durationS = round.duration_s != null ? Number(round.duration_s) : null;
      const distanceM = Number(round.distance_m ?? 0);
      const coveragePct =
        round.coverage_pct != null ? Number(round.coverage_pct) : null;
      const pointCount = Number(round.point_count ?? 0);
      const stopCount = Number(round.stop_count ?? 0);
      const flags = roundQualityFlags({ durationS, coveragePct, pointCount, stopCount });

      events.push({
        id: `round-${round.id}`,
        workerId,
        workerName:
          (round.scout_name as string) ??
          workers.find((w) => w.id === workerId)?.full_name ??
          "Scout",
        kind: "scouting_round",
        title: `Scouting round · ${stopCount} stops`,
        detail:
          [flags.length ? `Flags: ${flags.join(", ")}` : null, coveragePct != null ? `Coverage ${coveragePct}%` : null]
            .filter(Boolean)
            .join(" · ") || null,
        occurredAt: toIso(round.started_at),
        farmName: (round.farm_name as string) ?? null,
        greenhouseId: round.greenhouse_id ? String(round.greenhouse_id) : null,
        greenhouseName: (round.greenhouse_name as string) ?? null,
        severity: null,
        status: round.status as string,
        roundId: String(round.id),
        durationS,
        distanceM,
        coveragePct,
        stopCount,
        pointCount,
      });
    }

    events.sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );

    return ok({
      workers: workers.map((w) => ({ id: w.id, name: w.full_name })),
      events,
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not load worker trends.");
  }
}

export async function mssqlUpdateStaffAccount(input: {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  password?: string;
}) {
  const session = await requireServerSession();
  if (session.role !== "admin") return fail("Only admins can edit staff accounts.");

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  const password = input.password?.trim();

  if (fullName.length < 2) return fail("Enter the person’s full name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Enter a valid email address.");
  if (password && password.length < 8) return fail("Password must be at least 8 characters.");

  const pool = await getMssqlPool();
  const dup = await pool
    .request()
    .input("email", sql.NVarChar(320), email)
    .input("id", sql.UniqueIdentifier, input.userId)
    .query(`SELECT id FROM dbo.users WHERE LOWER(email) = @email AND id <> @id`);
  if (dup.recordset.length) return fail("That email is already used by another account.");

  const req = pool
    .request()
    .input("id", sql.UniqueIdentifier, input.userId)
    .input("full_name", sql.NVarChar(200), fullName)
    .input("email", sql.NVarChar(320), email)
    .input("phone", sql.NVarChar(40), phone || null);

  if (password) {
    const hash = await bcrypt.hash(password, 10);
    await req
      .input("password_hash", sql.NVarChar(255), hash)
      .query(`
        UPDATE dbo.users
        SET full_name = @full_name, email = @email, phone = @phone, password_hash = @password_hash
        WHERE id = @id
      `);
  } else {
    await req.query(`
      UPDATE dbo.users SET full_name = @full_name, email = @email, phone = @phone WHERE id = @id
    `);
  }

  return ok({ id: input.userId });
}
