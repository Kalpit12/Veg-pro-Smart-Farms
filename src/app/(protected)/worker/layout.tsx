import { AppShell, type NavItem } from "@/components/app-shell";
import { requireRole } from "@/lib/auth/require-role";

const workerNav: NavItem[] = [
  { href: "/worker/dashboard", label: "Home", icon: "dashboard" },
  { href: "/worker/field", label: "Field work", icon: "scan" },
];

export default async function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["worker"]);
  return (
    <AppShell navItems={workerNav} title="VegPro Worker App" roleMode="worker">
      {children}
    </AppShell>
  );
}
