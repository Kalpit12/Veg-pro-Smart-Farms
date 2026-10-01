import { randomUUID } from "crypto";

import { fail, ok, toIso } from "@/lib/mssql/result";
import { requireServerSession, type ServerSession } from "@/lib/mssql/session-server";
import { getMssqlPool, sql } from "@/lib/mssql/pool";
import type { CreateScoutingRecordInput } from "@/services/supabase/scouting-service";
import type { ScoutingIssueType, ScoutingRecord, ScoutingRound } from "@/types/db";
import type { RoutePointInput } from "@/services/supabase/scouting-route-service";
import { distanceBetweenPoints, durationSeconds } from "@/lib/route-metrics";
import type { ScoutingRoutePoint } from "@/types/db";
import { isUuid } from "@/lib/uuid";

function canReadAllScouting(session: ServerSession) {
  return session.role === "admin" || session.role === "supervisor";
}

export async function mssqlListCropCategories() {
  const pool = await getMssqlPool();
  const result = await pool.request().query(
    `SELECT id, name, created_at FROM dbo.crop_categories ORDER BY name`,
  );
  const data = result.recordset.map((r) => ({
    id: String(r.id),
    name: r.name as string,
    created_at: toIso(r.created_at),
  }));
  return ok(data);
}

export async function mssqlListCropVarieties(categoryId?: string) {
  const pool = await getMssqlPool();
  const request = pool.request();
  let query = `
    SELECT v.id, v.category_id, v.name, v.created_at, c.name AS category_name
    FROM dbo.crop_varieties v
    INNER JOIN dbo.crop_categories c ON c.id = v.category_id
  `;
  if (categoryId) {
    request.input("categoryId", sql.UniqueIdentifier, categoryId);
    query += ` WHERE v.category_id = @categoryId`;
  }
  query += ` ORDER BY v.name`;
  const result = await request.query(query);
  const data = result.recordset.map((r) => ({
    id: String(r.id),
    category_id: String(r.category_id),
    name: r.name as string,
    created_at: toIso(r.created_at),
    crop_categories: { name: r.category_name as string },
  }));
  return ok(data);
}

export async function mssqlListScoutingParameters() {
  const pool = await getMssqlPool();
  const result = await pool.request().query(
    `SELECT id, param_key, param_group, name, sort_order, created_at
     FROM dbo.scouting_parameters ORDER BY sort_order`,
  );
  const data = result.recordset.map((r) => ({
    id: String(r.id),
    param_key: r.param_key as string,
    param_group: r.param_group as string,
    name: r.name as string,
    sort_order: r.sort_order as number,
    created_at: toIso(r.created_at),
  }));
  return ok(data);
}

export async function mssqlCreateScoutingRecord(input: CreateScoutingRecordInput) {
  const session = await requireServerSession();
  if (input.scout_id !== session.id && session.role === "worker") {
    return fail("Workers can only save their own scouting stops.");
  }

  const pool = await getMssqlPool();
  const recordId = randomUUID();
  const recordedAt = input.recorded_at ?? new Date().toISOString();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    await new sql.Request(tx)
      .input("id", sql.UniqueIdentifier, recordId)
      .input("scout_id", sql.UniqueIdentifier, input.scout_id)
      .input("farm_id", sql.UniqueIdentifier, input.farm_id)
      .input("greenhouse_id", sql.UniqueIdentifier, input.greenhouse_id)
      .input("category_id", sql.UniqueIdentifier, input.category_id)
      .input("variety_id", sql.UniqueIdentifier, input.variety_id)
      .input("round_id", sql.UniqueIdentifier, input.round_id ?? null)
      .input("beds", sql.SmallInt, input.beds)
      .input("column_no", sql.SmallInt, input.column_no)
      .input("bay_no", sql.SmallInt, input.bay_no)
      .input("issue_type", sql.NVarChar(20), input.issue_type)
      .input("issue_name", sql.NVarChar(200), input.issue_name)
      .input("rating", sql.SmallInt, input.rating)
      .input("latitude", sql.Float, input.latitude ?? null)
      .input("longitude", sql.Float, input.longitude ?? null)
      .input("notes", sql.NVarChar(sql.MAX), input.notes ?? null)
      .input("image_url", sql.NVarChar(1000), input.image_url ?? null)
      .input("recorded_at", sql.DateTime2, new Date(recordedAt))
      .query(`
        INSERT INTO dbo.scouting_records (
          id, scout_id, farm_id, greenhouse_id, category_id, variety_id, round_id,
          beds, column_no, bay_no, issue_type, issue_name, rating,
          latitude, longitude, notes, image_url, recorded_at
        ) VALUES (
          @id, @scout_id, @farm_id, @greenhouse_id, @category_id, @variety_id, @round_id,
          @beds, @column_no, @bay_no, @issue_type, @issue_name, @rating,
          @latitude, @longitude, @notes, @image_url, @recorded_at
        )
      `);

    for (const o of input.observations) {
      await new sql.Request(tx)
        .input("id", sql.UniqueIdentifier, randomUUID())
        .input("record_id", sql.UniqueIdentifier, recordId)
        .input("parameter_id", sql.UniqueIdentifier, o.parameter_id)
        .input("present", sql.Bit, o.present ? 1 : 0)
        .input("rating", sql.SmallInt, o.rating)
        .query(`
          INSERT INTO dbo.scouting_observations (id, record_id, parameter_id, present, rating)
          VALUES (@id, @record_id, @parameter_id, @present, @rating)
        `);
    }

    await tx.commit();
  } catch (e) {
    await tx.rollback();
    return fail(e instanceof Error ? e.message : "Insert failed");
  }

  const row = await pool
    .request()
    .input("id", sql.UniqueIdentifier, recordId)
    .query(`SELECT * FROM dbo.scouting_records WHERE id = @id`);
  const r = row.recordset[0];
  const data: ScoutingRecord = {
    id: String(r.id),
    scout_id: String(r.scout_id),
    farm_id: String(r.farm_id),
    greenhouse_id: String(r.greenhouse_id),
    category_id: String(r.category_id),
    variety_id: String(r.variety_id),
    beds: r.beds,
    column_no: r.column_no,
    bay_no: r.bay_no,
    issue_type: r.issue_type as ScoutingIssueType,
    issue_name: r.issue_name,
    rating: r.rating,
    round_id: r.round_id ? String(r.round_id) : null,
    latitude: r.latitude,
    longitude: r.longitude,
    notes: r.notes,
    image_url: r.image_url,
    recorded_at: toIso(r.recorded_at),
    created_at: toIso(r.created_at),
  };
  return ok(data);
}

function mapRecordRows(recordset: Record<string, unknown>[]) {
  return recordset.map((r) => ({
    id: String(r.id),
    scout_id: String(r.scout_id),
    farm_id: String(r.farm_id),
    greenhouse_id: String(r.greenhouse_id),
    category_id: String(r.category_id),
    variety_id: String(r.variety_id),
    beds: r.beds as number,
    column_no: r.column_no as number,
    bay_no: r.bay_no as number,
    issue_type: r.issue_type as ScoutingIssueType,
    issue_name: r.issue_name as string,
    rating: r.rating as number | null,
    round_id: r.round_id ? String(r.round_id) : null,
    latitude: r.latitude as number | null,
    longitude: r.longitude as number | null,
    notes: r.notes as string | null,
    image_url: r.image_url as string | null,
    recorded_at: toIso(r.recorded_at),
    created_at: toIso(r.created_at),
    farms: r.farm_name ? { name: r.farm_name as string } : null,
    greenhouses: {
      name: (r.greenhouse_name as string) ?? "—",
      area_ha: r.area_ha as number | null,
    },
    crop_categories: r.category_name ? { name: r.category_name as string } : null,
    crop_varieties: r.variety_name ? { name: r.variety_name as string } : null,
    users: r.scout_name ? { full_name: r.scout_name as string } : null,
  }));
}

export async function mssqlListScoutingRecords(limit = 200) {
  const session = await requireServerSession();
  const pool = await getMssqlPool();
  const request = pool.request().input("limit", sql.Int, limit);
  let where = "";
  if (!canReadAllScouting(session)) {
    request.input("scoutId", sql.UniqueIdentifier, session.id);
    where = "WHERE r.scout_id = @scoutId";
  }
  const result = await request.query(`
    SELECT TOP (@limit) r.*,
      f.name AS farm_name, g.name AS greenhouse_name, g.area_ha,
      c.name AS category_name, v.name AS variety_name, u.full_name AS scout_name
    FROM dbo.scouting_records r
    INNER JOIN dbo.farms f ON f.id = r.farm_id
    INNER JOIN dbo.greenhouses g ON g.id = r.greenhouse_id
    INNER JOIN dbo.crop_categories c ON c.id = r.category_id
    INNER JOIN dbo.crop_varieties v ON v.id = r.variety_id
    INNER JOIN dbo.users u ON u.id = r.scout_id
    ${where}
    ORDER BY r.recorded_at DESC
  `);
  return ok(mapRecordRows(result.recordset));
}

export async function mssqlListScoutingRecordsSince(since: Date) {
  const session = await requireServerSession();
  const pool = await getMssqlPool();
  const request = pool
    .request()
    .input("since", sql.DateTime2, since);
  let where = "WHERE r.recorded_at >= @since";
  if (!canReadAllScouting(session)) {
    request.input("scoutId", sql.UniqueIdentifier, session.id);
    where += " AND r.scout_id = @scoutId";
  }
  const result = await request.query(`
    SELECT r.*,
      f.name AS farm_name, g.name AS greenhouse_name,
      c.name AS category_name, v.name AS variety_name, u.full_name AS scout_name
    FROM dbo.scouting_records r
    INNER JOIN dbo.farms f ON f.id = r.farm_id
    INNER JOIN dbo.greenhouses g ON g.id = r.greenhouse_id
    INNER JOIN dbo.crop_categories c ON c.id = r.category_id
    INNER JOIN dbo.crop_varieties v ON v.id = r.variety_id
    INNER JOIN dbo.users u ON u.id = r.scout_id
    ${where}
    ORDER BY r.recorded_at DESC
  `);
  return ok(mapRecordRows(result.recordset));
}

export async function mssqlListScoutingForGreenhouseSince(greenhouseId: string, since: Date) {
  const pool = await getMssqlPool();
  const result = await pool
    .request()
    .input("gh", sql.UniqueIdentifier, greenhouseId)
    .input("since", sql.DateTime2, since)
    .query(`
      SELECT r.id, r.latitude, r.longitude, r.issue_name, r.recorded_at, u.full_name AS scout_name
      FROM dbo.scouting_records r
      INNER JOIN dbo.users u ON u.id = r.scout_id
      WHERE r.greenhouse_id = @gh AND r.recorded_at >= @since
        AND r.latitude IS NOT NULL AND r.longitude IS NOT NULL
      ORDER BY r.recorded_at ASC
    `);
  const data = result.recordset.map((r) => ({
    id: String(r.id),
    latitude: r.latitude as number,
    longitude: r.longitude as number,
    issue_name: r.issue_name as string,
    recorded_at: toIso(r.recorded_at),
    users: { full_name: r.scout_name as string },
  }));
  return ok(data);
}

export async function mssqlGetScoutingPressureByGreenhouse(since?: Date) {
  const pool = await getMssqlPool();
  const request = pool.request();
  let where = "WHERE r.rating IS NOT NULL AND r.issue_name IS NOT NULL AND LOWER(r.issue_name) <> 'none found'";
  if (since) {
    request.input("since", sql.DateTime2, since);
    where += " AND r.recorded_at >= @since";
  }
  const result = await request.query(`
    SELECT r.issue_type, r.issue_name, r.rating, g.name AS greenhouse_name, v.name AS variety_name
    FROM dbo.scouting_records r
    INNER JOIN dbo.greenhouses g ON g.id = r.greenhouse_id
    INNER JOIN dbo.crop_varieties v ON v.id = r.variety_id
    ${where}
  `);

  const map = new Map<string, { greenhouse: string; variety: string; issue_type: ScoutingIssueType; issue_name: string; avg_rating: number; count: number; sum: number }>();
  for (const row of result.recordset) {
    const gh = (row.greenhouse_name as string) ?? "Unknown";
    const variety = (row.variety_name as string) ?? "Unknown";
    const key = `${gh}|${variety}|${row.issue_type}|${row.issue_name}`;
    const rating = row.rating as number;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      existing.sum += rating;
      existing.avg_rating = existing.sum / existing.count;
    } else {
      map.set(key, {
        greenhouse: gh,
        variety,
        issue_type: row.issue_type as ScoutingIssueType,
        issue_name: row.issue_name as string,
        avg_rating: rating,
        count: 1,
        sum: rating,
      });
    }
  }
  const data = Array.from(map.values()).map(({ sum, ...rest }) => {
    void sum;
    return rest;
  });
  return ok(data);
}

function mapRoundRow(r: Record<string, unknown>) {
  return {
    id: String(r.id),
    scout_id: String(r.scout_id),
    farm_id: String(r.farm_id),
    greenhouse_id: String(r.greenhouse_id),
    status: r.status as ScoutingRound["status"],
    started_at: toIso(r.started_at),
    ended_at: r.ended_at ? toIso(r.ended_at) : null,
    stop_count: r.stop_count as number,
    distance_m: Number(r.distance_m ?? 0),
    duration_s: r.duration_s as number | null,
    point_count: r.point_count as number,
    coverage_pct: r.coverage_pct as number | null,
    created_at: toIso(r.created_at),
    users: r.scout_name ? { full_name: r.scout_name as string } : null,
    greenhouses: r.greenhouse_name ? { name: r.greenhouse_name as string } : null,
    farms: r.farm_name ? { name: r.farm_name as string } : null,
  };
}

export async function mssqlGetAnyActiveRoundForScout(scoutId: string) {
  const pool = await getMssqlPool();
  const result = await pool
    .request()
    .input("scoutId", sql.UniqueIdentifier, scoutId)
    .query(`
      SELECT TOP 1 r.*, g.name AS greenhouse_name, f.name AS farm_name
      FROM dbo.scouting_rounds r
      INNER JOIN dbo.greenhouses g ON g.id = r.greenhouse_id
      INNER JOIN dbo.farms f ON f.id = r.farm_id
      WHERE r.scout_id = @scoutId AND r.status = 'active'
      ORDER BY r.started_at DESC
    `);
  const row = result.recordset[0];
  if (!row) return ok(null);
  return ok(mapRoundRow(row));
}

export async function mssqlStartScoutingRound(input: {
  scout_id: string;
  farm_id: string;
  greenhouse_id: string;
  id?: string;
  started_at?: string;
}) {
  await requireServerSession();
  const existing = await mssqlGetAnyActiveRoundForScout(input.scout_id);
  if (existing.data) return ok(existing.data);

  const pool = await getMssqlPool();
  const id = input.id ?? randomUUID();
  const started = input.started_at ? new Date(input.started_at) : new Date();
  await pool
    .request()
    .input("id", sql.UniqueIdentifier, id)
    .input("scout_id", sql.UniqueIdentifier, input.scout_id)
    .input("farm_id", sql.UniqueIdentifier, input.farm_id)
    .input("greenhouse_id", sql.UniqueIdentifier, input.greenhouse_id)
    .input("started_at", sql.DateTime2, started)
    .query(`
      INSERT INTO dbo.scouting_rounds (id, scout_id, farm_id, greenhouse_id, status, started_at)
      VALUES (@id, @scout_id, @farm_id, @greenhouse_id, 'active', @started_at)
    `);

  const row = await pool
    .request()
    .input("id", sql.UniqueIdentifier, id)
    .query(`SELECT * FROM dbo.scouting_rounds WHERE id = @id`);
  return ok(mapRoundRow(row.recordset[0]));
}

export async function mssqlCompleteScoutingRound(roundId: string) {
  const pool = await getMssqlPool();
  await pool
    .request()
    .input("id", sql.UniqueIdentifier, roundId)
    .input("ended", sql.DateTime2, new Date())
    .query(`
      UPDATE dbo.scouting_rounds SET status = 'completed', ended_at = @ended WHERE id = @id
    `);
  const row = await pool
    .request()
    .input("id", sql.UniqueIdentifier, roundId)
    .query(`SELECT * FROM dbo.scouting_rounds WHERE id = @id`);
  return ok(mapRoundRow(row.recordset[0]));
}

export async function mssqlListScoutingRounds(limit = 50) {
  const pool = await getMssqlPool();
  const result = await pool.request().input("limit", sql.Int, limit).query(`
    SELECT TOP (@limit) r.*, u.full_name AS scout_name, g.name AS greenhouse_name, f.name AS farm_name
    FROM dbo.scouting_rounds r
    INNER JOIN dbo.users u ON u.id = r.scout_id
    INNER JOIN dbo.greenhouses g ON g.id = r.greenhouse_id
    INNER JOIN dbo.farms f ON f.id = r.farm_id
    ORDER BY r.started_at DESC
  `);
  return ok(result.recordset.map(mapRoundRow));
}

export async function mssqlListScoutingRoundsBetween(from: Date, to: Date, limit = 80) {
  const pool = await getMssqlPool();
  const result = await pool
    .request()
    .input("from", sql.DateTime2, from)
    .input("to", sql.DateTime2, to)
    .input("limit", sql.Int, limit)
    .query(`
      SELECT TOP (@limit) r.*, u.full_name AS scout_name, g.name AS greenhouse_name, f.name AS farm_name
      FROM dbo.scouting_rounds r
      INNER JOIN dbo.users u ON u.id = r.scout_id
      INNER JOIN dbo.greenhouses g ON g.id = r.greenhouse_id
      INNER JOIN dbo.farms f ON f.id = r.farm_id
      WHERE r.started_at >= @from AND r.started_at <= @to
      ORDER BY r.started_at DESC
    `);
  return ok(result.recordset.map(mapRoundRow));
}

export async function mssqlListRecordsForRound(roundId: string) {
  if (!isUuid(roundId)) return ok([]);
  const pool = await getMssqlPool();
  const result = await pool
    .request()
    .input("roundId", sql.UniqueIdentifier, roundId)
    .query(`
      SELECT r.*, v.name AS variety_name, g.name AS greenhouse_name
      FROM dbo.scouting_records r
      INNER JOIN dbo.crop_varieties v ON v.id = r.variety_id
      INNER JOIN dbo.greenhouses g ON g.id = r.greenhouse_id
      WHERE r.round_id = @roundId
      ORDER BY r.recorded_at ASC
    `);
  const data = mapRecordRows(result.recordset).map((row, i) => ({
    ...row,
    crop_varieties: { name: result.recordset[i].variety_name as string },
    greenhouses: { name: result.recordset[i].greenhouse_name as string },
  }));
  return ok(data);
}

export async function mssqlAppendRoutePoints(roundId: string, points: RoutePointInput[]) {
  if (!isUuid(roundId) || !points.length) return ok([] as ScoutingRoutePoint[]);
  const pool = await getMssqlPool();
  for (const p of points) {
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, randomUUID())
      .input("round_id", sql.UniqueIdentifier, roundId)
      .input("lat", sql.Float, p.latitude)
      .input("lng", sql.Float, p.longitude)
      .input("acc", sql.Decimal(8, 2), p.accuracy_m ?? null)
      .input("recorded_at", sql.DateTime2, p.recorded_at ? new Date(p.recorded_at) : new Date())
      .query(`
        INSERT INTO dbo.scouting_route_points (id, round_id, latitude, longitude, accuracy_m, recorded_at)
        VALUES (@id, @round_id, @lat, @lng, @acc, @recorded_at)
      `);
  }
  const count = await pool
    .request()
    .input("roundId", sql.UniqueIdentifier, roundId)
    .query(`SELECT COUNT(*) AS cnt FROM dbo.scouting_route_points WHERE round_id = @roundId`);
  const pointCount = count.recordset[0].cnt as number;
  await pool
    .request()
    .input("roundId", sql.UniqueIdentifier, roundId)
    .input("point_count", sql.Int, pointCount)
    .query(`UPDATE dbo.scouting_rounds SET point_count = @point_count WHERE id = @roundId`);

  const listed = await mssqlListRoutePoints(roundId);
  return listed;
}

export async function mssqlListRoutePoints(roundId: string) {
  if (!isUuid(roundId)) return ok([] as ScoutingRoutePoint[]);
  const pool = await getMssqlPool();
  const result = await pool
    .request()
    .input("roundId", sql.UniqueIdentifier, roundId)
    .query(`
      SELECT * FROM dbo.scouting_route_points WHERE round_id = @roundId ORDER BY recorded_at ASC
    `);
  const data = result.recordset.map((r) => ({
    id: String(r.id),
    round_id: String(r.round_id),
    latitude: r.latitude as number,
    longitude: r.longitude as number,
    accuracy_m: r.accuracy_m as number | null,
    recorded_at: toIso(r.recorded_at),
  }));
  return ok(data);
}

export async function mssqlListRoutePointsForRounds(roundIds: string[]) {
  const ids = roundIds.filter(isUuid);
  if (!ids.length) return ok([] as ScoutingRoutePoint[]);
  const pool = await getMssqlPool();
  const req = pool.request();
  ids.forEach((id, i) => req.input(`id${i}`, sql.UniqueIdentifier, id));
  const q = await req.query(`
    SELECT * FROM dbo.scouting_route_points
    WHERE round_id IN (${ids.map((_, i) => `@id${i}`).join(",")})
    ORDER BY recorded_at ASC
  `);
  const data = q.recordset.map((r) => ({
    id: String(r.id),
    round_id: String(r.round_id),
    latitude: r.latitude as number,
    longitude: r.longitude as number,
    accuracy_m: r.accuracy_m as number | null,
    recorded_at: toIso(r.recorded_at),
  }));
  return ok(data);
}

export async function mssqlFinalizeRoundMetrics(
  roundId: string,
  options?: { coveragePct?: number | null },
) {
  if (!isUuid(roundId)) return fail("Invalid round id");
  const pool = await getMssqlPool();
  const roundRes = await pool
    .request()
    .input("id", sql.UniqueIdentifier, roundId)
    .query(`SELECT * FROM dbo.scouting_rounds WHERE id = @id`);
  const round = roundRes.recordset[0];
  if (!round) return fail("Round not found");

  const pointsRes = await mssqlListRoutePoints(roundId);
  const points = pointsRes.data ?? [];
  const endedAt = new Date();
  const distance_m = distanceBetweenPoints(
    points.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
  );
  const duration_s = durationSeconds(toIso(round.started_at), endedAt.toISOString());

  await pool
    .request()
    .input("id", sql.UniqueIdentifier, roundId)
    .input("distance_m", sql.Decimal(12, 2), distance_m)
    .input("duration_s", sql.Int, duration_s)
    .input("point_count", sql.Int, points.length)
    .input("coverage_pct", sql.Decimal(5, 2), options?.coveragePct ?? round.coverage_pct)
    .input("ended_at", sql.DateTime2, endedAt)
    .query(`
      UPDATE dbo.scouting_rounds SET
        status = 'completed', ended_at = @ended_at,
        distance_m = @distance_m, duration_s = @duration_s,
        point_count = @point_count, coverage_pct = @coverage_pct
      WHERE id = @id
    `);

  const updated = await pool
    .request()
    .input("id", sql.UniqueIdentifier, roundId)
    .query(`SELECT * FROM dbo.scouting_rounds WHERE id = @id`);
  return ok(mapRoundRow(updated.recordset[0]));
}

export async function mssqlListGreenhouseAnchors() {
  const pool = await getMssqlPool();
  const result = await pool.request().query(`
    SELECT g.id, g.name, g.farm_id, g.latitude, g.longitude, f.name AS farm_name
    FROM dbo.greenhouses g
    INNER JOIN dbo.farms f ON f.id = g.farm_id
    WHERE g.latitude IS NOT NULL AND g.longitude IS NOT NULL
  `);
  const data = result.recordset.map((row) => ({
    farmId: String(row.farm_id),
    farmName: (row.farm_name as string) ?? "Farm",
    greenhouseId: String(row.id),
    greenhouseName: row.name as string,
    lat: row.latitude as number,
    lng: row.longitude as number,
    fromDb: true,
  }));
  return { data, error: null as Error | null };
}
