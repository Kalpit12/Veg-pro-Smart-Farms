import { redirect } from "next/navigation";

export default function ManagerLoginPage() {
  redirect("/auth/login");
}
