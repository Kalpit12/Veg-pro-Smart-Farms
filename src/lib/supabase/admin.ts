import { createClient } from "@supabase/supabase-js";

import { getSupabaseServiceRoleKey } from "@/lib/supabase/config";

/** Auth Admin API. Server-only — never import this from a client component. */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY). Add it in .env.local and Vercel — never prefix it with NEXT_PUBLIC_.",
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
