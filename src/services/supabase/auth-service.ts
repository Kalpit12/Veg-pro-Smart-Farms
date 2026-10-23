import { hasMssqlEnv } from "@/lib/data-backend";
import {
  getOfflineFieldUser,
  rememberOfflineFieldUser,
} from "@/lib/offline-field-user";
import { isLikelyOfflineError } from "@/lib/network-errors";
import { getSessionAction } from "@/features/auth/sign-in-action";
import { createClient } from "@/lib/supabase/client";

export async function getCurrentUser() {
  const offline =
    typeof navigator !== "undefined" && navigator.onLine === false;

  if (hasMssqlEnv()) {
    if (offline) {
      return getOfflineFieldUser();
    }
    try {
      const session = await getSessionAction();
      if (!session) return getOfflineFieldUser();
      rememberOfflineFieldUser({ id: session.id, email: session.email });
      return { id: session.id, email: session.email };
    } catch (error) {
      if (isLikelyOfflineError(error)) return getOfflineFieldUser();
      throw error;
    }
  }
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    if (isLikelyOfflineError(error)) return getOfflineFieldUser();
    throw error;
  }
  if (!data.user) return getOfflineFieldUser();
  rememberOfflineFieldUser({ id: data.user.id, email: data.user.email ?? "" });
  return data.user;
}
