import { requireRole } from "@/lib/auth/require-role";
import { redirect } from "next/navigation";

export default async function ActivityLogsPage() {
  const { role } = await requireRole(["admin", "supervisor"]);
  redirect(role === "admin" ? "/admin/logs" : "/manager/logs");
}
