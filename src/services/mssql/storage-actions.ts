"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { getEvidenceRoot, resolveEvidencePath } from "@/lib/evidence/paths";
import { requireServerSession } from "@/lib/mssql/session-server";

async function saveEvidence(prefix: string, file: File) {
  await requireServerSession();
  const ext = file.name.split(".").pop() || "jpg";
  const relative = `${prefix}/${crypto.randomUUID()}.${ext}`;
  const full = resolveEvidencePath(relative);
  await mkdir(path.dirname(full), { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(full, buf);
  return relative;
}

export async function uploadScoutingEvidenceAction(file: File) {
  return saveEvidence("scouting", file);
}

export async function uploadActivityEvidenceAction(file: File) {
  return saveEvidence("activities", file);
}

export async function getEvidencePublicUrlAction(relativePath: string) {
  await requireServerSession();
  resolveEvidencePath(relativePath);
  return `/api/evidence/${relativePath.split("/").map(encodeURIComponent).join("/")}`;
}
