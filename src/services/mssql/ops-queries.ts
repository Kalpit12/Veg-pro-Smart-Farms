import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

import { fail, ok, toIso } from "@/lib/mssql/result";
import { requireServerSession } from "@/lib/mssql/session-server";
import { getMssqlPool, sql } from "@/lib/mssql/pool";
import type { InfestationStatus } from "@/types/db";
import type { ReportInfestationInput } from "@/services/supabase/infestation-service";
import type { LogSprayInput } from "@/services/supabase/spray-service";
import type { StaffAccountRole } from "@/features/admin/create-staff-account-action";

function hotspotSelectJoin() {
  return `
    SELECT h.*, f.name AS farm_name, g.name AS greenhouse_name, u.full_name AS reporter_name
    FROM dbo.infestation_hotspots h
    LEFT JOIN dbo.farms f ON f.id = h.farm_id
    LEFT JOIN dbo.greenhouses g ON g.id = h.greenhouse_id
    LEFT JOIN dbo.users u ON u.id = h.reported_by
  `;
}

function mapHotspot(r: Record<string, unknown>) {
  return {
    id: String(r.id),
    farm_id: String(r.farm_id),
    greenhouse_id: r.greenhouse_id ? String(r.greenhouse_id) : null,
    reported_by: String(r.reported_by),
    latitude: r.latitude as number,
    longitude: r.longitude as number,
    pest_type: r.pest_type as string,
    problem: r.problem as string,
    main_issue: r.main_issue as string,
    severity: r.severity as number,
    status: r.status as InfestationStatus,
    created_at: toIso(r.created_at),
    farms: r.farm_name ? { name: r.farm_name as string } : null,
    greenhouses: r.greenhouse_name ? { name: r.greenhouse_name as string } : null,
    users: r.reporter_name ? { full_name: r.reporter_name as string } : null,
  };
}

export async function mssqlReportInfestation(input: ReportInfestationInput) {
  await requireServerSession();
  const pool = await getMssqlPool();
  const id = randomUUID();
  await pool
    .request()
    .input("id", sql.UniqueIdentifier, id)
    .input("farm_id", sql.UniqueIdentifier, input.farm_id)
    .input("greenhouse_id", sql.UniqueIdentifier, input.greenhouse_id)
    .input("reported_by", sql.UniqueIdentifier, input.reported_by)
    .input("latitude", sql.Float, input.latitude)
    .input("longitude", sql.Float, input.longitude)
    .input("pest_type", sql.NVarChar(100), input.pest_type)
    .input("problem", sql.NVarChar(500), input.problem)
    .input("main_issue", sql.NVarChar(200), input.main_issue)
    .input("severity", sql.SmallInt, input.severity)
    .query(`
      INSERT INTO dbo.infestation_hotspots (
        id, farm_id, greenhouse_id, reported_by, latitude, longitude,
        pest_type, problem, main_issue, severity, status
      ) VALUES (
        @id, @farm_id, @greenhouse_id, @reported_by, @latitude, @longitude,
        @pest_type, @problem, @main_issue, @severity, 'active'
      )
    `);
  const row = await pool
    .request()
    .input("id", sql.UniqueIdentifier, id)
    .query(`${hotspotSelectJoin()} WHERE h.id = @id`);
  return ok(mapHotspot(row.recordset[0]));
}

async function listHotspotsQuery(where: string, params: Record<string, unknown>, limit: number) {
  const pool = await getMssqlPool();
  const req = pool.request().input("limit", sql.Int, limit);
  for (const [k, v] of Object.entries(params)) {
    if (v instanceof Date) req.input(k, sql.DateTime2, v);
    else if (typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v)) req.input(k, sql.UniqueIdentifier, v);
    else req.input(k, sql.NVarChar(200), String(v));
  }
  const result = await req.query(`
    SELECT TOP (@limit) h.*, f.name AS farm_name, g.name AS greenhouse_name, u.full_name AS reporter_name
    FROM dbo.infestation_hotspots h
    LEFT JOIN dbo.farms f ON f.id = h.farm_id
    LEFT JOIN dbo.greenhouses g ON g.id = h.greenhouse_id
    LEFT JOIN dbo.users u ON u.id = h.reported_by
    ${where}
    ORDER BY h.created_at DESC
  `);
  return ok(result.recordset.map(mapHotspot));
}

export async function mssqlListHotspots(limit = 200) {
  await requireServerSession();
  return listHotspotsQuery("WHERE 1=1", {}, limit);
}

export async function mssqlListHotspotsForHistory(options?: {
  greenhouseId?: string;
  since?: Date;
  limit?: number;
}) {
  await requireServerSession();
  const clauses = ["WHERE 1=1"];
  const params: Record<string, unknown> = {};
  if (options?.since) {
    clauses.push("AND h.created_at >= @since");
    params.since = options.since;
  }
  if (options?.greenhouseId) {
    clauses.push("AND h.greenhouse_id = @gh");
    params.gh = options.greenhouseId;
  }
  return listHotspotsQuery(clauses.join(" "), params, options?.limit ?? 500);
}

export async function mssqlListActiveHotspots(limit = 50) {
  await requireServerSession();
  const pool = await getMssqlPool();
  const result = await pool.request().input("limit", sql.Int, limit).query(`
    SELECT TOP (@limit) h.*, f.name AS farm_name, g.name AS greenhouse_name, u.full_name AS reporter_name
    FROM dbo.infestation_hotspots h
    LEFT JOIN dbo.farms f ON f.id = h.farm_id
    LEFT JOIN dbo.greenhouses g ON g.id = h.greenhouse_id
    LEFT JOIN dbo.users u ON u.id = h.reported_by
    WHERE h.status = 'active'
    ORDER BY h.severity DESC, h.created_at DESC
  `);
  return ok(result.recordset.map(mapHotspot));
}

export async function mssqlGetHotspotById(id: string) {
  await requireServerSession();
  const pool = await getMssqlPool();
  const result = await pool
    .request()
    .input("id", sql.UniqueIdentifier, id)
    .query(`${hotspotSelectJoin()} WHERE h.id = @id`);
  const row = result.recordset[0];
  if (!row) return fail("Hotspot not found");
  return ok(mapHotspot(row));
}

export async function mssqlListActiveHotspotsForGreenhouse(greenhouseId: string) {
  await requireServerSession();
  const pool = await getMssqlPool();
  const result = await pool
    .request()
    .input("gh", sql.UniqueIdentifier, greenhouseId)
    .query(`
      SELECT id, pest_type, problem, main_issue, severity, status, latitude, longitude, created_at, greenhouse_id, farm_id
      FROM dbo.infestation_hotspots
      WHERE greenhouse_id = @gh AND status = 'active'
      ORDER BY severity DESC
    `);
  return ok(
    result.recordset.map((r) => ({
      ...r,
      id: String(r.id),
      farm_id: String(r.farm_id),
      greenhouse_id: r.greenhouse_id ? String(r.greenhouse_id) : null,
      created_at: toIso(r.created_at),
    })),
  );
}

export async function mssqlUpdateHotspotStatus(id: string, status: InfestationStatus) {
  await requireServerSession();
  const pool = await getMssqlPool();
  await pool
    .request()
    .input("id", sql.UniqueIdentifier, id)
    .input("status", sql.NVarChar(20), status)
    .query(`UPDATE dbo.infestation_hotspots SET status = @status WHERE id = @id`);
  return ok(null);
}

export async function mssqlUpdateHotspotAfterSpray(
  id: string,
  options?: { severityAfter?: number | null },
) {
  await requireServerSession();
  const pool = await getMssqlPool();
  const req = pool.request().input("id", sql.UniqueIdentifier, id);
  if (
    options?.severityAfter != null &&
    options.severityAfter >= 1 &&
    options.severityAfter <= 5
  ) {
    await req
      .input("severity", sql.SmallInt, options.severityAfter)
      .query(`UPDATE dbo.infestation_hotspots SET status = 'sprayed', severity = @severity WHERE id = @id`);
  } else {
    await req.query(`UPDATE dbo.infestation_hotspots SET status = 'sprayed' WHERE id = @id`);
  }
  return ok(null);
}

export async function mssqlGetHotspotKpis() {
  await requireServerSession();
  const pool = await getMssqlPool();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [active, severe, resolvedToday] = await Promise.all([
    pool.request().query(`SELECT COUNT(*) AS c FROM dbo.infestation_hotspots WHERE status = 'active'`),
    pool
      .request()
      .query(
        `SELECT COUNT(*) AS c FROM dbo.infestation_hotspots WHERE status = 'active' AND severity >= 4`,
      ),
    pool
      .request()
      .input("since", sql.DateTime2, today)
      .query(
        `SELECT COUNT(*) AS c FROM dbo.infestation_hotspots WHERE status = 'resolved' AND created_at >= @since`,
      ),
  ]);
  return {
    activeHotspots: active.recordset[0].c as number,
    severeHotspots: severe.recordset[0].c as number,
    resolvedToday: resolvedToday.recordset[0].c as number,
  };
}

export async function mssqlLogSpray(input: LogSprayInput) {
  await requireServerSession();
  const pool = await getMssqlPool();
  const id = randomUUID();
  await pool
    .request()
    .input("id", sql.UniqueIdentifier, id)
    .input("worker_id", sql.UniqueIdentifier, input.worker_id)
    .input("hotspot_id", sql.UniqueIdentifier, input.hotspot_id)
    .input("farm_id", sql.UniqueIdentifier, input.farm_id)
    .input("greenhouse_id", sql.UniqueIdentifier, input.greenhouse_id)
    .input("latitude", sql.Float, input.latitude)
    .input("longitude", sql.Float, input.longitude)
    .input("product_name", sql.NVarChar(200), input.product_name)
    .input("notes", sql.NVarChar(sql.MAX), input.notes ?? null)
    .input("image_url", sql.NVarChar(1000), input.image_url ?? null)
    .input("severity_before", sql.SmallInt, input.severity_before ?? null)
    .input("severity_after", sql.SmallInt, input.severity_after ?? null)
    .query(`
      INSERT INTO dbo.spray_treatments (
        id, worker_id, hotspot_id, farm_id, greenhouse_id, latitude, longitude,
        product_name, notes, image_url, severity_before, severity_after
      ) VALUES (
        @id, @worker_id, @hotspot_id, @farm_id, @greenhouse_id, @latitude, @longitude,
        @product_name, @notes, @image_url, @severity_before, @severity_after
      )
    `);
  const row = await pool
    .request()
    .input("id", sql.UniqueIdentifier, id)
    .query(`SELECT * FROM dbo.spray_treatments WHERE id = @id`);
  const r = row.recordset[0];
  return ok({
    ...r,
    id: String(r.id),
    worker_id: String(r.worker_id),
    created_at: toIso(r.created_at),
  });
}

export async function mssqlListSprays(limit = 200) {
  await requireServerSession();
  const pool = await getMssqlPool();
  const result = await pool.request().input("limit", sql.Int, limit).query(`
    SELECT TOP (@limit) s.*, f.name AS farm_name, g.name AS greenhouse_name, u.full_name AS worker_name
    FROM dbo.spray_treatments s
    LEFT JOIN dbo.farms f ON f.id = s.farm_id
    LEFT JOIN dbo.greenhouses g ON g.id = s.greenhouse_id
    LEFT JOIN dbo.users u ON u.id = s.worker_id
    ORDER BY s.created_at DESC
  `);
  return ok(
    result.recordset.map((r) => ({
      ...r,
      id: String(r.id),
      created_at: toIso(r.created_at),
      farms: r.farm_name ? { name: r.farm_name as string } : null,
      greenhouses: r.greenhouse_name ? { name: r.greenhouse_name as string } : null,
      users: r.worker_name ? { full_name: r.worker_name as string } : null,
    })),
  );
}

export async function mssqlGetSpraysTodayCount() {
  await requireServerSession();
  const pool = await getMssqlPool();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const result = await pool
    .request()
    .input("since", sql.DateTime2, today)
    .query(`SELECT COUNT(*) AS c FROM dbo.spray_treatments WHERE created_at >= @since`);
  return ok({ count: result.recordset[0].c as number });
}

export async function mssqlUpsertWorkerPosition(
  workerId: string,
  latitude: number,
  longitude: number,
) {
  await requireServerSession();
  const pool = await getMssqlPool();
  await pool
    .request()
    .input("worker_id", sql.UniqueIdentifier, workerId)
    .input("latitude", sql.Float, latitude)
    .input("longitude", sql.Float, longitude)
    .query(`
      MERGE dbo.worker_positions AS t
      USING (SELECT @worker_id AS worker_id) AS s ON t.worker_id = s.worker_id
      WHEN MATCHED THEN UPDATE SET latitude = @latitude, longitude = @longitude, updated_at = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN INSERT (worker_id, latitude, longitude) VALUES (@worker_id, @latitude, @longitude);
    `);
  return ok({ worker_id: workerId, latitude, longitude });
}

export async function mssqlListWorkerPositions() {
  await requireServerSession();
  const pool = await getMssqlPool();
  const result = await pool.request().query(`
    SELECT p.*, u.full_name, u.role
    FROM dbo.worker_positions p
    INNER JOIN dbo.users u ON u.id = p.worker_id
    WHERE u.role = 'worker'
    ORDER BY p.updated_at DESC
  `);
  return ok(
    result.recordset.map((r) => ({
      worker_id: String(r.worker_id),
      latitude: r.latitude as number,
      longitude: r.longitude as number,
      updated_at: toIso(r.updated_at),
      users: { full_name: r.full_name as string, role: r.role as string },
    })),
  );
}

export async function mssqlGetWorkersInFieldCount() {
  await requireServerSession();
  const pool = await getMssqlPool();
  const since = new Date(Date.now() - 1000 * 60 * 30);
  const result = await pool
    .request()
    .input("since", sql.DateTime2, since)
    .query(`SELECT COUNT(*) AS c FROM dbo.worker_positions WHERE updated_at >= @since`);
  return ok({ count: result.recordset[0].c as number });
}

export async function mssqlCreateAlert(type: string, message: string) {
  await requireServerSession();
  const pool = await getMssqlPool();
  const id = randomUUID();
  await pool
    .request()
    .input("id", sql.UniqueIdentifier, id)
    .input("type", sql.NVarChar(100), type)
    .input("message", sql.NVarChar(sql.MAX), message)
    .query(`INSERT INTO dbo.alerts (id, type, message, status) VALUES (@id, @type, @message, 'open')`);
  return ok({ id });
}

export async function mssqlListOpenAlerts(limit = 5) {
  await requireServerSession();
  const pool = await getMssqlPool();
  const result = await pool.request().input("limit", sql.Int, limit).query(`
    SELECT TOP (@limit) id, type, message, created_at FROM dbo.alerts
    WHERE status = 'open' ORDER BY created_at DESC
  `);
  return ok(
    result.recordset.map((r) => ({
      id: String(r.id),
      type: r.type as string,
      message: r.message as string,
      created_at: toIso(r.created_at),
    })),
  );
}

export async function mssqlListStaffAccounts() {
  const session = await requireServerSession();
  if (session.role !== "admin" && session.role !== "supervisor") {
    return fail("Not allowed");
  }
  const pool = await getMssqlPool();
  const result = await pool.request().query(`
    SELECT id, full_name, email, phone, role, created_at FROM dbo.users ORDER BY created_at DESC
  `);
  return ok(
    result.recordset.map((r) => ({
      id: String(r.id),
      full_name: r.full_name as string,
      email: r.email as string,
      phone: r.phone as string | null,
      role: r.role as string,
      created_at: toIso(r.created_at),
    })),
  );
}

export async function mssqlCreateStaffAccount(input: {
  fullName: string;
  email: string;
  phone: string;
  role: StaffAccountRole;
  password: string;
}) {
  const session = await requireServerSession();
  if (session.role !== "admin") return fail("Only admins can create accounts.");
  const pool = await getMssqlPool();
  const existing = await pool
    .request()
    .input("email", sql.NVarChar(320), input.email.toLowerCase())
    .query(`SELECT id FROM dbo.users WHERE LOWER(email) = @email`);
  if (existing.recordset.length) return fail("That email already has an account.");

  const id = randomUUID();
  const hash = await bcrypt.hash(input.password, 10);
  await pool
    .request()
    .input("id", sql.UniqueIdentifier, id)
    .input("email", sql.NVarChar(320), input.email.toLowerCase())
    .input("full_name", sql.NVarChar(200), input.fullName)
    .input("phone", sql.NVarChar(40), input.phone || null)
    .input("role", sql.NVarChar(20), input.role)
    .input("password_hash", sql.NVarChar(255), hash)
    .query(`
      INSERT INTO dbo.users (id, email, full_name, phone, role, password_hash)
      VALUES (@id, @email, @full_name, @phone, @role, @password_hash)
    `);
  return ok({ id, email: input.email, role: input.role, fullName: input.fullName });
}

export async function mssqlGetWeeklyTrendsRaw() {
  await requireServerSession();
  const pool = await getMssqlPool();
  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);
  const req = pool.request().input("since", sql.DateTime2, since);
  const [reports, sprays, scouting] = await Promise.all([
    req.query(`SELECT created_at FROM dbo.infestation_hotspots WHERE created_at >= @since`),
    pool
      .request()
      .input("since", sql.DateTime2, since)
      .query(`SELECT created_at FROM dbo.spray_treatments WHERE created_at >= @since`),
    pool
      .request()
      .input("since", sql.DateTime2, since)
      .query(`SELECT recorded_at FROM dbo.scouting_records WHERE recorded_at >= @since`),
  ]);
  return ok({
    reports: reports.recordset.map((r) => toIso(r.created_at)),
    sprays: sprays.recordset.map((r) => toIso(r.created_at)),
    scouting: scouting.recordset.map((r) => toIso(r.recorded_at)),
  });
}

export async function mssqlGetAdminDailyAnalyticsRaw() {
  await requireServerSession();
  const pool = await getMssqlPool();
  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);
  const [hotspots, scouting] = await Promise.all([
    pool
      .request()
      .query(
        `SELECT pest_type, severity FROM dbo.infestation_hotspots WHERE status = 'active'`,
      ),
    pool
      .request()
      .input("since", sql.DateTime2, since)
      .query(`
        SELECT r.issue_type, g.name AS greenhouse_name
        FROM dbo.scouting_records r
        INNER JOIN dbo.greenhouses g ON g.id = r.greenhouse_id
        WHERE r.recorded_at >= @since
      `),
  ]);
  return ok({
    activeHotspots: hotspots.recordset.map((r) => ({
      pest_type: r.pest_type as string,
      severity: r.severity as number,
    })),
    scoutingStops: scouting.recordset.map((r) => ({
      issue_type: r.issue_type as string,
      greenhouse_name: (r.greenhouse_name as string) ?? "Unknown",
    })),
  });
}

export async function mssqlGetDashboardKpis() {
  await requireServerSession();
  const pool = await getMssqlPool();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [farms, alerts, scouting, hotspots, sprays, workers] = await Promise.all([
    pool.request().query(`SELECT COUNT(*) AS c FROM dbo.farms`),
    pool.request().query(`SELECT COUNT(*) AS c FROM dbo.alerts WHERE status = 'open'`),
    pool
      .request()
      .input("since", sql.DateTime2, today)
      .query(`SELECT COUNT(*) AS c FROM dbo.scouting_records WHERE recorded_at >= @since`),
    mssqlGetHotspotKpis(),
    mssqlGetSpraysTodayCount(),
    mssqlGetWorkersInFieldCount(),
  ]);
  return ok({
    farms: farms.recordset[0].c as number,
    openAlerts: alerts.recordset[0].c as number,
    scoutingStopsToday: scouting.recordset[0].c as number,
    activeHotspots: hotspots.activeHotspots,
    severeHotspots: hotspots.severeHotspots,
    spraysToday: sprays.data?.count ?? 0,
    workersInField: workers.data?.count ?? 0,
  });
}
