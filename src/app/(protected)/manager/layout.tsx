import { AppShell, type NavItem } from "@/components/app-shell";
import { requireRole } from "@/lib/auth/require-role";

const managerNav: NavItem[] = [
  { href: "/manager/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/manager/map", label: "Map", icon: "map" },
  { href: "/manager/scouting", label: "Scouting", icon: "logs" },
  { href: "/manager/workers", label: "Workers", icon: "workers" },
  { href: "/manager/spray", label: "Log spray", icon: "spray" },
  { href: "/manager/history", label: "History", icon: "history" },
];

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["supervisor"]);
  return (
    <AppShell navItems={managerNav} title="Farm manager" roleMode="manager">
      {children}
    </AppShell>
  );
}
