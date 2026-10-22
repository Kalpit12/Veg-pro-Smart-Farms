import { NextResponse } from "next/server";

import { getServerDataBackend } from "@/lib/data-backend";

export const dynamic = "force-dynamic";

export function GET() {
  const dataBackend = getServerDataBackend();
  return NextResponse.json(
    {
      dataBackend,
      production: dataBackend !== "demo",
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
