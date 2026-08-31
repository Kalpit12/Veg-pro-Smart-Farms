"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth-store";
import type { Role } from "@/types/db";

export function useAuth() {
  const setRole = useAuthStore((s) => s.setRole);

  useEffect(() => {
    const run = async () => {
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
