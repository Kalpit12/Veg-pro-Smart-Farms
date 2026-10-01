"use client";

import { useEffect } from "react";
import { getSessionAction } from "@/features/auth/sign-in-action";
import { hasMssqlEnv, hasSupabaseEnv } from "@/lib/data-backend";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth-store";
import type { Role } from "@/types/db";

export function useAuth() {
  const setRole = useAuthStore((s) => s.setRole);

  useEffect(() => {
    const run = async () => {
      if (hasMssqlEnv()) {
        const session = await getSessionAction();
        setRole(session?.role ?? null);
        return;
      }
      if (!hasSupabaseEnv()) return;
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", data.user.id)
        .single();
      setRole((profile?.role as Role) ?? null);
    };
    void run();
  }, [setRole]);
}
