import { randomUUID } from "node:crypto";

import { kenyaNowIso } from "@/lib/kenya-time";
import { bindSqlDateTime2 } from "@/lib/mssql/datetime";
import { fail, ok, toIso } from "@/lib/mssql/result";
import { requireServerSession } from "@/lib/mssql/session-server";
import { getMssqlPool, sql } from "@/lib/mssql/pool";
import { isSqlGuid } from "@/lib/uuid";
import type { ActivityLogRow, ActivityLogStatus } from "@/services/supabase/activity-log-service";
import { formatScoutingIssueLabel, sprayActivityNotes } from "@/lib/spray-log-context";
import type { HotspotRow } from "@/services/supabase/infestation-service";

function hotspotLogStatus(status: string): ActivityLogStatus {
  if (status === "resolved") return "resolved";
  if (status === "sprayed") return "approved";
  return "pending";
}

export async function mssqlListActivities(params: {
  status?: "pending" | "approved" | "rejected";
  limit?: number;
}) {
  try {
    await requireServerSession();
    const pool = await getMssqlPool();
    const req = pool.request();
    let where = "WHERE 1=1";
    if (params.status) {
      req.input("status", sql.NVarChar(20), params.status);
      where += " AND a.status = @status";
    }
    const limit = params.limit ?? 200;
    req.input("limit", sql.Int, limit);
    const result = await req.query(`
      SELECT TOP (@limit) a.id, a.activity_type, a.status, a.created_at, a.notes, a.image_url,
             u.full_name AS worker_name, f.name AS farm_name, g.name AS greenhouse_name, g.crop_type AS variety_name
      FROM dbo.activities a
      INNER JOIN dbo.users u ON u.id = a.worker_id
      LEFT JOIN dbo.farms f ON f.id = a.farm_id
      LEFT JOIN dbo.greenhouses g ON g.id = a.greenhouse_id
      ${where}
      ORDER BY a.created_at DESC
    `);
    return ok(
      result.recordset.map((r) => ({
        id: String(r.id),
        activity_type: r.activity_type as string,
        status: r.status as string,
        created_at: toIso(r.created_at),
        notes: r.notes as string | null,
        image_url: r.image_url as string | null,
        gps_location: null,
        users: r.worker_name ? { full_name: r.worker_name as string } : null,
        farms: r.farm_name ? { name: r.farm_name as string } : null,
        greenhouses: r.greenhouse_name ? { name: r.greenhouse_name as string } : null,
        variety: (r.variety_name as string) || null,
      })),
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/activities|Invalid object name/i.test(msg)) {
      return ok([]);
    }
    return fail(msg);
  }
}

export async function mssqlSubmitActivity(input: {
  worker_id: string;
  farm_id: string;
  greenhouse_id?: string | null;
  activity_type: string;
  notes?: string | null;
  image_url?: string | null;
  gps_location?: string | null;
}) {
  try {
    const session = await requireServerSession();
    if (session.id !== input.worker_id) {
      return fail("You can only submit activities for your own account.");
    }
    if (session.role !== "worker" && session.role !== "supervisor") {
      return fail("Only field workers can submit activities for approval.");
    }

    const activityType = input.activity_type.trim();
    if (activityType.length < 3) {
      return fail("Activity type is required.");
    }
    if (!isSqlGuid(input.farm_id)) {
      return fail("Invalid farm.");
    }

    const greenhouseId =
      input.greenhouse_id && isSqlGuid(input.greenhouse_id) ? input.greenhouse_id : null;

    const pool = await getMssqlPool();
    const id = randomUUID();
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, id)
      .input("worker_id", sql.UniqueIdentifier, input.worker_id)
      .input("farm_id", sql.UniqueIdentifier, input.farm_id)
      .input("greenhouse_id", sql.UniqueIdentifier, greenhouseId)
      .input("activity_type", sql.NVarChar(100), activityType)
      .input("notes", sql.NVarChar(sql.MAX), input.notes?.trim() || null)
      .input("image_url", sql.NVarChar(1000), input.image_url ?? null)
      .input("gps_location", sql.NVarChar(200), input.gps_location ?? null)
      .input("created_at", sql.DateTime2, bindSqlDateTime2(kenyaNowIso()))
      .query(`
        INSERT INTO dbo.activities (
          id, worker_id, farm_id, greenhouse_id, activity_type, notes, image_url, gps_location, status, created_at
        ) VALUES (
          @id, @worker_id, @farm_id, @greenhouse_id, @activity_type, @notes, @image_url, @gps_location, N'pending', @created_at
        )
      `);

    const row = await pool
      .request()
      .input("id", sql.UniqueIdentifier, id)
      .query(`
        SELECT a.id, a.activity_type, a.status, a.created_at, a.notes, a.image_url, a.gps_location,
               u.full_name AS worker_name, f.name AS farm_name, g.name AS greenhouse_name
        FROM dbo.activities a
        INNER JOIN dbo.users u ON u.id = a.worker_id
        LEFT JOIN dbo.farms f ON f.id = a.farm_id
        LEFT JOIN dbo.greenhouses g ON g.id = a.greenhouse_id
        WHERE a.id = @id
      `);

    const r = row.recordset[0];
    return ok({
      id: String(r.id),
      activity_type: r.activity_type as string,
      status: r.status as string,
      created_at: toIso(r.created_at),
      notes: r.notes as string | null,
      image_url: r.image_url as string | null,
      gps_location: r.gps_location as string | null,
      users: r.worker_name ? { full_name: r.worker_name as string } : null,
      farms: r.farm_name ? { name: r.farm_name as string } : null,
      greenhouses: r.greenhouse_name ? { name: r.greenhouse_name as string } : null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not submit activity.";
    if (/activities|Invalid object name/i.test(msg)) {
      return fail("Activities table is missing. Run sql/mssql/003_activities.sql on the Scouting database.");
    }
    return fail(msg);
  }
}

export async function mssqlSetActivityStatus(id: string, status: "approved" | "rejected") {
  try {
    const session = await requireServerSession();
    if (session.role !== "admin" && session.role !== "supervisor") {
      return fail("Not allowed to approve activities.");
    }
    const pool = await getMssqlPool();
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, id)
      .input("status", sql.NVarChar(20), status)
      .query(`UPDATE dbo.activities SET status = @status WHERE id = @id`);
    return ok({ id, status });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not update activity.");
  }
}

export async function mssqlListUnifiedActivityLogs(params: {
  q?: string;
  status?: ActivityLogStatus | "";
  limit?: number;
}) {
  try {
    await requireServerSession();
    const limit = params.limit ?? 100;
    const pool = await getMssqlPool();

    const [activitiesRes, hotspotsRes, spraysRes, scoutingRes] = await Promise.all([
      pool.request().query(`
        SELECT TOP (200) a.id, a.activity_type, a.status, a.created_at, a.notes, a.image_url,
               u.full_name AS worker_name, f.name AS farm_name, g.name AS greenhouse_name, g.crop_type AS variety_name
        FROM dbo.activities a
        INNER JOIN dbo.users u ON u.id = a.worker_id
        LEFT JOIN dbo.farms f ON f.id = a.farm_id
        LEFT JOIN dbo.greenhouses g ON g.id = a.greenhouse_id
        ORDER BY a.created_at DESC
      `),
      pool.request().query(`
        SELECT TOP (200) h.id, h.pest_type, h.problem, h.main_issue, h.severity, h.status, h.created_at,
               u.full_name AS reporter_name, f.name AS farm_name, g.name AS greenhouse_name, g.crop_type AS variety_name
        FROM dbo.infestation_hotspots h
        LEFT JOIN dbo.users u ON u.id = h.reported_by
        LEFT JOIN dbo.farms f ON f.id = h.farm_id
        LEFT JOIN dbo.greenhouses g ON g.id = h.greenhouse_id
        ORDER BY h.created_at DESC
      `),
      pool.request().query(`
        SELECT TOP (200) s.id, s.product_name, s.notes, s.created_at, s.hotspot_id, s.worker_id,
               u.full_name AS worker_name, f.name AS farm_name, g.name AS greenhouse_name, g.crop_type AS variety_name
        FROM dbo.spray_treatments s
        LEFT JOIN dbo.users u ON u.id = s.worker_id
        LEFT JOIN dbo.farms f ON f.id = s.farm_id
        LEFT JOIN dbo.greenhouses g ON g.id = s.greenhouse_id
        ORDER BY s.created_at DESC
      `),
      pool.request().query(`
        SELECT TOP (200) r.id, r.issue_type, r.issue_name, r.rating, r.recorded_at,
               u.full_name AS scout_name, f.name AS farm_name, g.name AS greenhouse_name,
               v.name AS variety_name
        FROM dbo.scouting_records r
        INNER JOIN dbo.users u ON u.id = r.scout_id
        INNER JOIN dbo.farms f ON f.id = r.farm_id
        INNER JOIN dbo.greenhouses g ON g.id = r.greenhouse_id
        LEFT JOIN dbo.crop_varieties v ON v.id = r.variety_id
        ORDER BY r.recorded_at DESC
      `),
    ]);

    const hotspotRows: HotspotRow[] = hotspotsRes.recordset.map((h) => ({
      id: String(h.id),
      pest_type: h.pest_type as string,
      problem: h.problem as string,
      main_issue: h.main_issue as string,
      severity: h.severity as number,
      status: h.status as HotspotRow["status"],
      created_at: toIso(h.created_at),
      reported_by: "",
      farm_id: "",
      greenhouse_id: null,
      latitude: 0,
      longitude: 0,
      users: h.reporter_name ? { full_name: h.reporter_name as string } : null,
      farms: h.farm_name ? { name: h.farm_name as string } : null,
      greenhouses: h.greenhouse_name ? { name: h.greenhouse_name as string } : null,
    }));
    const hotspotsById = new Map(hotspotRows.map((h) => [h.id, h]));

    const rows: ActivityLogRow[] = [];

    for (const a of activitiesRes.recordset) {
      rows.push({
        id: `activity-${a.id}`,
        activity_type: a.activity_type as string,
        status: a.status as ActivityLogStatus,
        created_at: toIso(a.created_at),
        notes: a.notes as string | null,
        image_url: a.image_url as string | null,
        users: a.worker_name ? { full_name: a.worker_name as string } : null,
        farms: a.farm_name ? { name: a.farm_name as string } : null,
        greenhouses: a.greenhouse_name ? { name: a.greenhouse_name as string } : null,
        variety: (a.variety_name as string) || null,
      });
    }

    for (const h of hotspotsRes.recordset) {
      rows.push({
        id: `hotspot-${h.id}`,
        activity_type: "Infestation report",
        status: hotspotLogStatus(h.status as string),
        created_at: toIso(h.created_at),
        notes: `${h.pest_type}: ${h.main_issue} (severity ${h.severity}/5)`,
        image_url: null,
        users: h.reporter_name ? { full_name: h.reporter_name as string } : null,
        farms: h.farm_name ? { name: h.farm_name as string } : null,
        greenhouses: h.greenhouse_name ? { name: h.greenhouse_name as string } : null,
        variety: (h.variety_name as string) || null,
      });
    }

    for (const s of spraysRes.recordset) {
      const spray = {
        product_name: s.product_name as string,
        notes: s.notes as string | null,
        hotspot_id: s.hotspot_id ? String(s.hotspot_id) : null,
      };
      const hotspot = s.hotspot_id ? hotspotsById.get(String(s.hotspot_id)) : null;
      rows.push({
        id: `spray-${s.id}`,
        activity_type: "Spray treatment",
        status: "approved",
        created_at: toIso(s.created_at),
        notes: sprayActivityNotes(spray.product_name, spray.notes, hotspot ?? null),
        image_url: null,
        users: s.worker_name ? { full_name: s.worker_name as string } : null,
        farms: s.farm_name ? { name: s.farm_name as string } : null,
        greenhouses: s.greenhouse_name ? { name: s.greenhouse_name as string } : null,
        variety: (s.variety_name as string) || null,
      });
    }

    for (const r of scoutingRes.recordset) {
      rows.push({
        id: `scout-${r.id}`,
        activity_type: "Scouting stop",
        status: "approved",
        created_at: toIso(r.recorded_at),
        notes: formatScoutingIssueLabel(
          r.issue_type as "pest" | "disease",
          r.issue_name as string,
          r.rating as number | null,
        ),
        image_url: null,
        users: r.scout_name ? { full_name: r.scout_name as string } : null,
        farms: r.farm_name ? { name: r.farm_name as string } : null,
        greenhouses: r.greenhouse_name ? { name: r.greenhouse_name as string } : null,
        variety: (r.variety_name as string) || null,
      });
    }

    let result = rows.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    if (params.status) {
      result = result.filter((row) => row.status === params.status);
    }
    if (params.q) {
      const needle = params.q.toLowerCase();
      result = result.filter(
        (row) =>
          row.activity_type.toLowerCase().includes(needle) ||
          (row.notes?.toLowerCase().includes(needle) ?? false) ||
          (row.users?.full_name?.toLowerCase().includes(needle) ?? false) ||
          (row.farms?.name?.toLowerCase().includes(needle) ?? false) ||
          (row.greenhouses?.name?.toLowerCase().includes(needle) ?? false) ||
          (row.variety?.toLowerCase().includes(needle) ?? false),
      );
    }
    return ok(result.slice(0, limit));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/Invalid object name/i.test(msg)) {
      return ok([]);
    }
    return fail(msg);
  }
}
