import path from "path";

export function getEvidenceRoot() {
  return process.env.EVIDENCE_STORAGE_PATH ?? path.join(process.cwd(), "data", "evidence");
}

export function resolveEvidencePath(relativePath: string) {
  const root = path.resolve(getEvidenceRoot());
  const full = path.resolve(root, relativePath.replace(/^\/+/, ""));
  if (!full.startsWith(root + path.sep) && full !== root) {
    throw new Error("Invalid evidence path");
  }
  return full;
}
