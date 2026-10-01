"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LoginShell } from "@/features/auth/login-shell";
import { RoleSelect, type LoginPortal } from "@/features/auth/role-select";
import { ROLE_ROUTES } from "@/lib/constants";
import {
  loadLoginPrefs,
  saveLoginPrefs,
  type DemoLoginRole,
} from "@/lib/login-remember";
import {
  getSessionAction,
  signInWithPasswordAction,
} from "@/features/auth/sign-in-action";
import { hasConfiguredBackend, hasMssqlEnv, hasSupabaseEnv } from "@/lib/data-backend";
import { createClient } from "@/lib/supabase/client";
import type { Role } from "@/types/db";

const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30;

export type { LoginPortal };

const PORTAL_CONFIG = {
  worker: {
    demoRole: "worker" as const,
    allowedRoles: ["worker"] as Role[],
    continueLabel: "Field worker",
  },
  manager: {
    demoRole: "supervisor" as const,
    allowedRoles: ["supervisor"] as Role[],
    continueLabel: "Farm manager",
  },
  admin: {
    demoRole: "admin" as const,
    allowedRoles: ["admin"] as Role[],
    continueLabel: "Admin",
  },
} as const;

function demoRoleToPortal(demoRole: DemoLoginRole): LoginPortal {
  if (demoRole === "supervisor") return "manager";
  if (demoRole === "admin") return "admin";
  return "worker";
}

export function LoginForm({ initialPortal }: { initialPortal?: LoginPortal }) {
  const router = useRouter();
  const passwordAuth = hasConfiguredBackend();
  const supabaseConfigured = hasSupabaseEnv();

  const [portal, setPortal] = useState<LoginPortal>(initialPortal ?? "worker");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  const config = PORTAL_CONFIG[portal];

  useEffect(() => {
    setMounted(true);
    const prefs = loadLoginPrefs();
    setEmail(prefs.email);
    setRememberMe(prefs.rememberMe);
    setPortal(initialPortal ?? demoRoleToPortal(prefs.demoRole));
    setPrefsLoaded(true);
  }, [initialPortal]);

  useEffect(() => {
    if (!passwordAuth || !prefsLoaded) return;

    if (hasMssqlEnv()) {
      void getSessionAction().then((session) => {
        if (session) router.replace(ROLE_ROUTES[session.role]);
      });
      return;
    }

    const supabase = createClient();
    void supabase.auth
      .getUser()
      .then(async ({ data: { user } }) => {
        if (!user) return;

        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        const role = (profile?.role ?? "worker") as Role;
        router.replace(ROLE_ROUTES[role]);
      })
      .catch(() => {
        /* Browser may be blocked from calling Auth; password submit uses the server. */
      });
  }, [passwordAuth, prefsLoaded, router]);

  const goToDashboard = (role: Role) => {
    router.push(ROLE_ROUTES[role]);
    router.refresh();
  };

  const setDemoCookies = () => {
    const maxAge = rememberMe ? REMEMBER_MAX_AGE : 0;
    document.cookie = `demo_role=${config.demoRole}; path=/; max-age=${maxAge}`;
    document.cookie = `demo_auth=1; path=/; max-age=${maxAge}`;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (!passwordAuth) {
      if (rememberMe) saveLoginPrefs(email, true, config.demoRole);
      setDemoCookies();
      goToDashboard(config.demoRole);
      return;
    }

    setBusy(true);
    const result = await signInWithPasswordAction(email, password);
    if (!result.ok) {
      setMessage(result.error);
      setBusy(false);
      return;
    }

    saveLoginPrefs(
      email,
      rememberMe,
      result.role === "supervisor" ? "supervisor" : result.role === "admin" ? "admin" : "worker",
    );

    goToDashboard(result.role);
    setBusy(false);
  };

  if (!mounted) {
    return (
      <LoginShell>
        <div className="glass-card flex justify-center rounded-2xl p-10">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </LoginShell>
    );
  }

  return (
    <LoginShell>
      <form className="glass-card space-y-4 rounded-2xl p-6" onSubmit={onSubmit}>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Sign in</h2>
        </div>

        <div className="space-y-3">
          <div className="block space-y-1.5">
            <span className="text-sm font-medium">Role</span>
            <RoleSelect
              value={portal}
              onChange={setPortal}
              disabled={!prefsLoaded || busy}
            />
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Email</span>
            <input
              className="w-full rounded-lg border border-border bg-background p-3 text-base"
              placeholder="you@farm.com"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!prefsLoaded || busy}
              required={passwordAuth}
            />
          </label>

          {passwordAuth ? (
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Password</span>
              <div className="relative">
                <input
                  className="w-full rounded-lg border border-border bg-background p-3 pr-11 text-base"
                  placeholder="Password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy}
                  required
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={busy}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden />
                  ) : (
                    <Eye className="size-4" aria-hidden />
                  )}
                </button>
              </div>
            </label>
          ) : null}

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border-border accent-primary"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={busy}
            />
            <span>Remember me</span>
          </label>
        </div>

        <Button className="w-full" type="submit" disabled={!prefsLoaded || busy}>
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>

        {!passwordAuth ? (
          <p className="text-center text-xs text-muted-foreground">
            Demo mode — no password required
          </p>
        ) : null}

        {message ? (
          <p className="text-sm text-destructive" role="alert">
            {message}
          </p>
        ) : null}
      </form>
    </LoginShell>
  );
}
