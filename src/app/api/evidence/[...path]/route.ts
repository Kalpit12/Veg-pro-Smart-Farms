import { readFile } from "fs/promises";
import path from "path";

import { getSessionFromCookies } from "@/lib/auth/session";
import { resolveEvidencePath } from "@/lib/evidence/paths";

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { path: segments } = await context.params;
  const relative = segments.join("/");
  try {
    const full = resolveEvidencePath(relative);
    const buf = await readFile(full);
    const ext = path.extname(full).toLowerCase();
    const type =
      ext === ".png"
        ? "image/png"
        : ext === ".webp"
          ? "image/webp"
          : "image/jpeg";
    return new Response(buf, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
