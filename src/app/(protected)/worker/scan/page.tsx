import Link from "next/link";

import { QrScanner } from "@/features/activities/qr-scanner";

export default function WorkerScanPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold">Greenhouse QR check-in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scan the entrance QR, then continue to field work to start scouting.
        </p>
      </header>
      <QrScanner />
      <Link
        href="/worker/field"
        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        Continue to field work
      </Link>
    </section>
  );
}
