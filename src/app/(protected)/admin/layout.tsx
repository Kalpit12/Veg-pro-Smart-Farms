import { AppShell, type NavItem } from "@/components/app-shell";
import { requireRole } from "@/lib/auth/require-role";

const adminNav: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/scouting", label: "Scouting", icon: "logs" },
  { href: "/admin/map", label: "Map", icon: "map" },
  { href: "/admin/workforce", label: "Staff", icon: "workers" },
  { href: "/admin/trends", label: "Trends", icon: "trends" },
  { href: "/admin/history", label: "History", icon: "history" },
  { href: "/admin/approvals", label: "Approvals", icon: "supervisor" },
  { href: "/admin/logs", label: "Activity logs", icon: "logs" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["admin"]);
  return (
    <AppShell navItems={adminNav} title="Admin" roleMode="admin">
      {children}
    </AppShell>
  );
}
