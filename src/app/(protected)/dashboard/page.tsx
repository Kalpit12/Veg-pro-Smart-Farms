import { requireRole } from "@/lib/auth/require-role";
import { ROLE_ROUTES } from "@/lib/constants";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const { role } = await requireRole(["admin", "supervisor", "worker"]);
  redirect(ROLE_ROUTES[role]);
}
