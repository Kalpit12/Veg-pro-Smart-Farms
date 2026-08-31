"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  Droplets,
  History,
  LogOut,
  MapPin,
  Menu,
  QrCode,
  Sprout,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type NavItem = {
  href: string;
  label: string;
  icon:
    | "dashboard"
    | "map"
    | "workers"
    | "history"
    | "scan"
    | "logs"
    | "supervisor"
    | "spray"
    | "trends";
};

const iconMap = {
  dashboard: BarChart3,
  map: MapPin,
  workers: Users,
  history: History,
  scan: QrCode,
  logs: ClipboardList,
  supervisor: ClipboardList,
  spray: Droplets,
  trends: TrendingUp,
  logout: LogOut,
} as const;

function SidebarBrand({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
        <Sprout className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">VegPro Smart Farm</p>
      </div>
    </div>
  );
}

function SidebarNav({
  navItems,
  pathname,
  onNavigate,
}: {
  navItems: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const Icon = iconMap[item.icon];
        const active = pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-primary/10 hover:text-foreground",
              active && "bg-primary/15 text-foreground shadow-sm",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarPanel({
  title,
  roleMode,
  navItems,
  pathname,
  onNavigate,
  className,
}: {
  title: string;
  roleMode: "worker" | "manager" | "admin";
  navItems: NavItem[];
  pathname: string;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <aside className={cn("glass-card flex h-full flex-col rounded-3xl p-4", className)}>
      <div className="mb-5">
        <SidebarBrand title={title} />
      </div>

      <div className="flex-1 overflow-y-auto">
        <SidebarNav navItems={navItems} pathname={pathname} onNavigate={onNavigate} />
      </div>

      <div className="mt-4 border-t border-border/70 pt-4">
        <LogoutButton
          roleMode={roleMode}
          variant="ghost"
          size="default"
          className="min-h-11 w-full justify-start rounded-xl px-3 py-2.5 text-sm"
        />
      </div>
    </aside>
  );
}

function workspaceCopy(roleMode: "worker" | "manager" | "admin") {
  if (roleMode === "worker") {
    return {
      title: "Field worker workspace",
      description: "Live GPS tracking, scouting stops, and infestation reports from the field.",
    };
  }
  if (roleMode === "admin") {
    return {
      title: "Admin",
      description: "Hotspots, map, workers, and scouting.",
    };
  }
  return {
    title: "Farm manager",
    description: "Spray priorities, map, and field updates.",
  };
}

export function AppShell({
  children,
  navItems,
  title,
  roleMode,
}: {
  children: React.ReactNode;
  navItems: NavItem[];
  title: string;
  roleMode: "worker" | "manager" | "admin";
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [sidebarOpen]);

  const closeSidebar = () => setSidebarOpen(false);
  const workspace = workspaceCopy(roleMode);

  return (
    <div className="min-h-screen bg-background">
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] md:hidden"
          onClick={closeSidebar}
        />
      ) : null}

      <div className="flex w-full gap-3 p-3 pb-[calc(6.25rem+env(safe-area-inset-bottom,0px))] md:gap-4 md:p-4 md:pb-4">
        <div className="hidden w-64 shrink-0 md:block">
          <div className="sticky top-4">
            <SidebarPanel
              title={title}
              roleMode={roleMode}
              navItems={navItems}
              pathname={pathname}
            />
          </div>
        </div>

        <div
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-[min(18rem,88vw)] p-3 transition-transform duration-200 md:hidden",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <SidebarPanel
            title={title}
            roleMode={roleMode}
            navItems={navItems}
            pathname={pathname}
            onNavigate={closeSidebar}
            className="h-full shadow-2xl"
          />
        </div>

        <main className="min-w-0 flex-1 space-y-4">
          <div className="glass-card rounded-3xl p-4">
            <div className="flex items-start gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="mt-0.5 size-11 shrink-0 md:hidden"
                aria-label="Open navigation"
                onClick={() => setSidebarOpen((open) => !open)}
              >
                {sidebarOpen ? <X className="size-4" /> : <Menu className="size-4" />}
              </Button>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{workspace.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
                  {workspace.description}
                </p>
              </div>
            </div>
          </div>
          {children}
        </main>
      </div>

      <nav className="glass-card fixed inset-x-3 bottom-3 z-30 flex rounded-3xl p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] md:hidden">
        {navItems.map((item) => {
          const Icon = iconMap[item.icon];
          const active = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[0.68rem] leading-none text-muted-foreground sm:text-xs",
                active && "bg-primary/15 text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
