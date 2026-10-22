import { getServerDataBackend } from "@/lib/data-backend";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv, hasSupabaseServiceRole } from "@/lib/supabase/config";
import { resolveUserRole } from "@/lib/auth/resolve-user-role";
import { requireServerSession } from "@/lib/mssql/session-server";
import { getMssqlPool, sql } from "@/lib/mssql/pool";

export type FarmGreenhouseCatalogItem = {
  farmId: string;
  farmName: string;
  greenhouses: { id: string; name: string }[];
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeGreenhouseIds(ids: string[]): string[] {
  const seen = new Set<string>();
  for (const raw of ids) {
    const id = raw.trim().toLowerCase();
    if (UUID_RE.test(id)) seen.add(id);
  }
  return [...seen];
}

async function assertAdminSupabase() {
  if (!hasSupabaseEnv()) throw new Error("Database is not configured.");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in as an admin.");
  const { data: actor } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
  if (actor?.role !== "admin") throw new Error("Only admins can manage farm manager access.");
}

async function assertAdminMssql() {
  const session = await requireServerSession();
  if (session.role !== "admin") throw new Error("Only admins can manage farm manager access.");
}

export async function listFarmsGreenhousesCatalog(): Promise<{
  data: FarmGreenhouseCatalogItem[];
  error: { message: string } | null;
}> {
  try {
    if (getServerDataBackend() === "mssql") {
      await assertAdminMssql();
      const pool = await getMssqlPool();
      const result = await pool.request().query(`
        SELECT f.id AS farm_id, f.name AS farm_name, g.id AS greenhouse_id, g.name AS greenhouse_name
        FROM dbo.farms f
        INNER JOIN dbo.greenhouses g ON g.farm_id = f.id
        ORDER BY f.name, g.name
      `);
      const byFarm = new Map<string, FarmGreenhouseCatalogItem>();
      for (const row of result.recordset) {
        const farmId = String(row.farm_id);
        let farm = byFarm.get(farmId);
        if (!farm) {
          farm = {
            farmId,
            farmName: row.farm_name as string,
            greenhouses: [],
          };
          byFarm.set(farmId, farm);
        }
        farm.greenhouses.push({
          id: String(row.greenhouse_id),
          name: row.greenhouse_name as string,
        });
      }
      return { data: [...byFarm.values()], error: null };
    }

    await assertAdminSupabase();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("farms")
      .select("id, name, greenhouses(id, name)")
      .order("name");
    if (error) return { data: [], error: { message: error.message } };
    const catalog: FarmGreenhouseCatalogItem[] = (data ?? []).map((farm) => ({
      farmId: farm.id as string,
      farmName: farm.name as string,
      greenhouses: ((farm.greenhouses ?? []) as { id: string; name: string }[]).sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    }));
    return { data: catalog, error: null };
  } catch (e) {
    return {
      data: [],
      error: { message: e instanceof Error ? e.message : "Could not load farms." },
    };
  }
}

export async function getSupervisorGreenhouseIds(userId: string): Promise<{
  data: string[];
  error: { message: string } | null;
}> {
  const trimmed = userId.trim();
  if (!UUID_RE.test(trimmed)) {
    return { data: [], error: { message: "Invalid user id." } };
  }
  try {
    if (getServerDataBackend() === "mssql") {
      await assertAdminMssql();
      const pool = await getMssqlPool();
      const result = await pool
        .request()
        .input("user_id", sql.UniqueIdentifier, trimmed)
        .query(
          `SELECT greenhouse_id FROM dbo.supervisor_greenhouse_access WHERE user_id = @user_id`,
        );
      return {
        data: result.recordset.map((r) => String(r.greenhouse_id)),
        error: null,
      };
    }

    await assertAdminSupabase();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("supervisor_greenhouse_access")
      .select("greenhouse_id")
      .eq("user_id", trimmed);
    if (error) return { data: [], error: { message: error.message } };
    return { data: (data ?? []).map((r) => r.greenhouse_id as string), error: null };
  } catch (e) {
    return {
      data: [],
      error: { message: e instanceof Error ? e.message : "Could not load access." },
    };
  }
}

export async function replaceSupervisorGreenhouseAccess(
  userId: string,
  greenhouseIds: string[],
): Promise<{ error: { message: string } | null }> {
  const trimmedUser = userId.trim();
  if (!UUID_RE.test(trimmedUser)) {
    return { error: { message: "Invalid user id." } };
  }
  const ids = normalizeGreenhouseIds(greenhouseIds);
  if (!ids.length) {
    return { error: { message: "Select at least one greenhouse for this farm manager." } };
  }

  try {
    if (getServerDataBackend() === "mssql") {
      await assertAdminMssql();
      const pool = await getMssqlPool();
      const roleCheck = await pool
        .request()
        .input("id", sql.UniqueIdentifier, trimmedUser)
        .query(`SELECT role FROM dbo.users WHERE id = @id`);
      const role = roleCheck.recordset[0]?.role as string | undefined;
      if (role !== "supervisor") {
        return { error: { message: "Site access applies to farm managers only." } };
      }

      await pool.request().input("user_id", sql.UniqueIdentifier, trimmedUser).query(`
        DELETE FROM dbo.supervisor_greenhouse_access WHERE user_id = @user_id
      `);

      for (const ghId of ids) {
        await pool
          .request()
          .input("user_id", sql.UniqueIdentifier, trimmedUser)
          .input("greenhouse_id", sql.UniqueIdentifier, ghId)
          .query(`
            INSERT INTO dbo.supervisor_greenhouse_access (user_id, greenhouse_id)
            VALUES (@user_id, @greenhouse_id)
          `);
      }
      return { error: null };
    }

    await assertAdminSupabase();
    if (!hasSupabaseServiceRole()) {
      return {
        error: {
          message: "Server is missing SUPABASE_SERVICE_ROLE_KEY.",
        },
      };
    }
    const admin = createServiceRoleClient();
    const { data: profile } = await admin
      .from("users")
      .select("role")
      .eq("id", trimmedUser)
      .maybeSingle();
    if (profile?.role !== "supervisor") {
      return { error: { message: "Site access applies to farm managers only." } };
    }

    const { error: delError } = await admin
      .from("supervisor_greenhouse_access")
      .delete()
      .eq("user_id", trimmedUser);
    if (delError) return { error: { message: delError.message } };

    const { error: insError } = await admin.from("supervisor_greenhouse_access").insert(
      ids.map((greenhouse_id) => ({
        user_id: trimmedUser,
        greenhouse_id,
      })),
    );
    if (insError) return { error: { message: insError.message } };

    return { error: null };
  } catch (e) {
    return {
      error: { message: e instanceof Error ? e.message : "Could not save access." },
    };
  }
}

/** Used when creating a supervisor in one transaction (MSSQL). */
export async function insertSupervisorGreenhouseAccessMssql(
  userId: string,
  greenhouseIds: string[],
) {
  const ids = normalizeGreenhouseIds(greenhouseIds);
  const pool = await getMssqlPool();
  for (const ghId of ids) {
    await pool
      .request()
      .input("user_id", sql.UniqueIdentifier, userId)
      .input("greenhouse_id", sql.UniqueIdentifier, ghId)
      .query(`
        INSERT INTO dbo.supervisor_greenhouse_access (user_id, greenhouse_id)
        VALUES (@user_id, @greenhouse_id)
      `);
  }
}

function groupGreenhouseRows(
  rows: { farm_id: string; farm_name: string; greenhouse_id: string; greenhouse_name: string }[],
): FarmGreenhouseCatalogItem[] {
  const byFarm = new Map<string, FarmGreenhouseCatalogItem>();
  for (const row of rows) {
    let farm = byFarm.get(row.farm_id);
    if (!farm) {
      farm = {
        farmId: row.farm_id,
        farmName: row.farm_name,
        greenhouses: [],
      };
      byFarm.set(row.farm_id, farm);
    }
    farm.greenhouses.push({ id: row.greenhouse_id, name: row.greenhouse_name });
  }
  for (const farm of byFarm.values()) {
    farm.greenhouses.sort((a, b) => a.name.localeCompare(b.name));
  }
  return [...byFarm.values()].sort((a, b) => a.farmName.localeCompare(b.farmName));
}

/** Farms and greenhouses assigned to the signed-in farm manager. */
export async function listAssignedSitesForCurrentSupervisor(): Promise<{
  data: FarmGreenhouseCatalogItem[];
  error: { message: string } | null;
}> {
  try {
    const backend = getServerDataBackend();
    if (backend === "demo") {
      return { data: [], error: null };
    }

    if (backend === "mssql") {
      const session = await requireServerSession();
      if (session.role !== "supervisor") {
        return { data: [], error: null };
      }
      const pool = await getMssqlPool();
      const result = await pool
        .request()
        .input("user_id", sql.UniqueIdentifier, session.id)
        .query(`
          SELECT f.id AS farm_id, f.name AS farm_name, g.id AS greenhouse_id, g.name AS greenhouse_name
          FROM dbo.supervisor_greenhouse_access a
          INNER JOIN dbo.greenhouses g ON g.id = a.greenhouse_id
          INNER JOIN dbo.farms f ON f.id = g.farm_id
          WHERE a.user_id = @user_id
          ORDER BY f.name, g.name
        `);
      const rows = result.recordset.map((r) => ({
        farm_id: String(r.farm_id),
        farm_name: r.farm_name as string,
        greenhouse_id: String(r.greenhouse_id),
        greenhouse_name: r.greenhouse_name as string,
      }));
      return { data: groupGreenhouseRows(rows), error: null };
    }

    if (!hasSupabaseEnv()) {
      return { data: [], error: null };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { data: [], error: { message: "Not signed in." } };
    }

    const { role } = await resolveUserRole(supabase, user.id, user);
    if (role !== "supervisor") {
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from("supervisor_greenhouse_access")
      .select(
        "greenhouse_id, greenhouses(id, name, farm_id, farms(id, name))",
      )
      .eq("user_id", user.id);

    if (error) {
      if (/supervisor_greenhouse_access|does not exist/i.test(error.message)) {
        return { data: [], error: null };
      }
      return { data: [], error: { message: error.message } };
    }

    const rows: {
      farm_id: string;
      farm_name: string;
      greenhouse_id: string;
      greenhouse_name: string;
    }[] = [];

    for (const row of data ?? []) {
      const gh = row.greenhouses as
        | {
            id: string;
            name: string;
            farm_id: string;
            farms: { id: string; name: string } | { id: string; name: string }[] | null;
          }
        | null;
      if (!gh) continue;
      const farms = gh.farms;
      const farm = Array.isArray(farms) ? farms[0] : farms;
      if (!farm) continue;
      rows.push({
        farm_id: farm.id,
        farm_name: farm.name,
        greenhouse_id: gh.id,
        greenhouse_name: gh.name,
      });
    }

    return { data: groupGreenhouseRows(rows), error: null };
  } catch (e) {
    return {
      data: [],
      error: { message: e instanceof Error ? e.message : "Could not load assigned sites." },
    };
  }
}
