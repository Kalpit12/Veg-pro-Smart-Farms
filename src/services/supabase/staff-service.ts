import { routeDataThroughMssql } from "@/lib/mssql/client-routing";
import { createClient } from "@/lib/supabase/client";
import type { AppUser } from "@/types/db";
import { mssqlListStaffAccountsAction } from "@/services/mssql/ops-actions";

export async function listStaffAccounts() {
  if (routeDataThroughMssql()) return mssqlListStaffAccountsAction();
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
