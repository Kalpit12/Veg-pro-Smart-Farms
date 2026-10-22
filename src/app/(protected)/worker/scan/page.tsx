import { redirect } from "next/navigation";

/** QR check-in is disabled for workers; use Field work greenhouse picker. */
export default function WorkerScanPage() {
  redirect("/worker/field");
}
