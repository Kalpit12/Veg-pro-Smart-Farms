import { redirect } from "next/navigation";

export default function WorkerLoginPage() {
  redirect("/auth/login");
}
