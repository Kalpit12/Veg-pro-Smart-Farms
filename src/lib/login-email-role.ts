import type { DemoLoginRole } from "@/lib/login-remember";
import type { Role } from "@/types/db";

/** Known VegPro demo / seed accounts. */
const EMAIL_ROLE_MAP: Record<string, Role> = {
  "admin@vegpro.com": "admin",
  "manager@vegpro.com": "supervisor",
  "worker@vegpro.com": "worker",
};

/** Local part before @ — e.g. admin@any.domain → admin. */
const LOCAL_PART_ROLE: Record<string, Role> = {
  admin: "admin",
  manager: "supervisor",
  supervisor: "supervisor",
  worker: "worker",
};

/** Infer dashboard role from sign-in email (demo mode and UX hints). */
export function roleFromLoginEmail(email: string): Role | null {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return null;

  const mapped = EMAIL_ROLE_MAP[normalized];
  if (mapped) return mapped;

  const local = normalized.split("@")[0] ?? "";
  return LOCAL_PART_ROLE[local] ?? null;
}

export function demoLoginRoleFromRole(role: Role): DemoLoginRole {
  if (role === "admin") return "admin";
  if (role === "supervisor") return "supervisor";
  return "worker";
}
