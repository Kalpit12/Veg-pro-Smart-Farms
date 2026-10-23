import { redirect } from "next/navigation";

/** Approvals are disabled for admin — use Activity logs instead. */
export default function AdminApprovalsPage() {
  redirect("/admin/dashboard");
}
