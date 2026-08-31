import { createClient } from "@/lib/supabase/client";
import type { AppUser } from "@/types/db";

export async function listStaffAccounts() {
  const supabase = createClient();
  return supabase
    .from("users")
    .select("id, full_name, email, phone, role, created_at")
    .order("created_at", { ascending: false });
}

export type StaffAccountRow = Pick<
  AppUser,
  "id" | "full_name" | "email" | "phone" | "role" | "created_at"
>;
