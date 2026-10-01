import { hasMssqlEnv } from "@/lib/data-backend";
import { getSessionAction } from "@/features/auth/sign-in-action";
import { createClient } from "@/lib/supabase/client";

export async function getCurrentUser() {
  if (hasMssqlEnv()) {
    const session = await getSessionAction();
    if (!session) return null;
    return { id: session.id, email: session.email };
  }
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) return null;
  return data.user;
}
