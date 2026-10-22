import type { AppUser } from "@/types/db";

export type StaffAccountRow = Pick<
  AppUser,
  "id" | "full_name" | "email" | "phone" | "role" | "is_active" | "created_at"
>;
