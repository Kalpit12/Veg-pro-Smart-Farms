import { NextResponse } from "next/server";

import { resolveBasemapConfig } from "@/lib/map-basemap";

export const dynamic = "force-dynamic";

export function GET() {
  const config = resolveBasemapConfig(process.env);
  return NextResponse.json(config, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
