import type { Role } from "@/types/db";

export const ROLE_ROUTES: Record<Role, string> = {
  admin: "/admin/dashboard",
  supervisor: "/manager/dashboard",
  worker: "/worker/field",
};

export const PUBLIC_ROUTES = [
  "/",
  "/auth/login",
  "/auth/login/worker",
  "/auth/login/manager",
  "/auth/login/admin",
];

export const ROLE_ALLOWED_PREFIXES: Record<Role, string[]> = {
  admin: ["/admin"],
  supervisor: ["/manager"],
  worker: ["/worker"],
};

export const PORTAL_LABELS: Record<Role, string> = {
  worker: "Worker",
  supervisor: "Farm Manager",
  admin: "Admin",
};
