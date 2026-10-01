"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import type { VariantProps } from "class-variance-authority";

import { Button, buttonVariants } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatWorkerLogoutMessage } from "@/lib/worker-logout-alert";
import { hasSupabaseEnv } from "@/lib/data-backend";
import { signOutAction } from "@/features/auth/sign-in-action";
import { notifyAdminWorkerLogout } from "@/services/worker-logout-notify";
import { useScanStore } from "@/store/scan-store";
import { cn } from "@/lib/utils";

type Props = {
  roleMode: "worker" | "manager" | "admin";
  className?: string;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  showIcon?: boolean;
  label?: string;
};

export function LogoutButton({
  roleMode,
  className,
  variant = "outline",
  size = "sm",
  showIcon = true,
  label = "Logout",
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const handleLogout = async () => {
    if (busy) return;

    if (roleMode === "worker") {
      const confirmed = window.confirm(
        "Warning: Logging out can interrupt your live location tracking for the current shift. This action notifies your manager/supervisor. Do you want to continue?",
      );
      if (!confirmed) return;
    }

    try {
      setBusy(true);

      if (roleMode === "worker") {
        const context = await notifyAdminWorkerLogout();
        const summary = formatWorkerLogoutMessage(context);

        if (!hasSupabaseEnv()) {
          toast({
            title: "Manager notified",
            description: summary,
            tone: "success",
          });
        }
      }

      await signOutAction();

      document.cookie = "demo_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "demo_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      useScanStore.getState().clear();
      router.push("/auth/login");
      router.refresh();
    } catch (e) {
      toast({
        title: "Logout failed",
        description: e instanceof Error ? e.message : "Unknown error",
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleLogout}
      disabled={busy}
      className={cn("gap-2", className)}
    >
      {showIcon ? <LogOut className="size-4 shrink-0" /> : null}
      <span>{busy ? "Logging out..." : label}</span>
    </Button>
  );
}
