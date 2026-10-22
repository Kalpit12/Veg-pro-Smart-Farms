import { redirect } from "next/navigation";

export default function SupervisorPage() {
  redirect("/manager/approvals");
}
