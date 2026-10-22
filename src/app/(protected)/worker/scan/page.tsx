import Link from "next/link";

import { ActivityForm } from "@/features/activities/activity-form";
import { QrScanner } from "@/features/activities/qr-scanner";

export default function WorkerScanPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold">Greenhouse QR check-in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scan the entrance QR, then submit an activity for manager approval or continue to field scouting.
        </p>
      </header>
      <QrScanner />
      <ActivityForm />
      <Link
        href="/worker/field"
        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        Continue to field work
      </Link>
    </section>
  );
}
