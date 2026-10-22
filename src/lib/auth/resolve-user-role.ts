import type { User } from "@supabase/supabase-js";

import type { Role } from "@/types/db";

type ProfileRow = { role?: Role | null; is_active?: boolean | null };

export type SupabaseReader = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => {
        maybeSingle: () => Promise<{ data: ProfileRow | null; error: { message: string } | null }>;
        single: () => Promise<{ data: ProfileRow | null; error: { message: string } | null }>;
      };
    };
  };
};

function isRole(value: unknown): value is Role {
  return value === "admin" || value === "supervisor" || value === "worker";
}

function roleFromAuthUser(user: User | null | undefined): Role | null {
  const meta = user?.app_metadata?.role;
  return isRole(meta) ? meta : null;
}

/** Role from public.users, with is_active column fallback and auth app_metadata backup. */
export async function resolveUserRole(
  supabase: SupabaseReader,
  userId: string,
  authUser?: User | null,
): Promise<{ role: Role; is_active: boolean }> {
  let { data, error } = await supabase
    .from("users")
    .select("role, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (error && /is_active/i.test(error.message)) {
    const fallback = await supabase.from("users").select("role").eq("id", userId).maybeSingle();
    data = fallback.data ? { role: fallback.data.role, is_active: true } : null;
    error = fallback.error;
  }

  if (data?.role && isRole(data.role)) {
    return {
      role: data.role,
      is_active: data.is_active !== false,
    };
  }

  const fromMeta = roleFromAuthUser(authUser);
  if (fromMeta) {
    return { role: fromMeta, is_active: true };
  }

  return { role: "worker", is_active: true };
}
