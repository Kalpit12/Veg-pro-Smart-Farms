/** Client API key: legacy `anon` JWT or new `sb_publishable_...` key (same role). */
export function getSupabaseAnonKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

export function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && getSupabaseAnonKey());
}

/** Server-only. Never expose with NEXT_PUBLIC_. */
export function getSupabaseServiceRoleKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    null
  );
}

export function hasSupabaseServiceRole() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && getSupabaseServiceRoleKey());
}
