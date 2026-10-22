"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LoginShell } from "@/features/auth/login-shell";
import { ROLE_ROUTES } from "@/lib/constants";
import {
  demoLoginRoleFromRole,
  roleFromLoginEmail,
} from "@/lib/login-email-role";
import {
  loadLoginPrefs,
  saveLoginPrefs,
} from "@/lib/login-remember";
import {
  getSessionAction,
  signInWithPasswordAction,
} from "@/features/auth/sign-in-action";
import { hasConfiguredBackend } from "@/lib/data-backend";
import type { Role } from "@/types/db";

const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const passwordAuth = hasConfiguredBackend();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prefs = loadLoginPrefs();
    setEmail(prefs.email);
    setRememberMe(prefs.rememberMe);
    setPrefsLoaded(true);
    if (searchParams.get("inactive") === "1") {
      setMessage(
        "This account is inactive. Contact an administrator to restore access.",
      );
    }
  }, [searchParams]);

  useEffect(() => {
    if (!passwordAuth || !prefsLoaded) return;

    void getSessionAction().then((session) => {
      if (session) router.replace(ROLE_ROUTES[session.role]);
    });
  }, [passwordAuth, prefsLoaded, router]);

  const goToDashboard = (role: Role) => {
    router.push(ROLE_ROUTES[role]);
    router.refresh();
  };

  const setDemoCookies = (role: Role) => {
    const maxAge = rememberMe ? REMEMBER_MAX_AGE : 0;
    document.cookie = `demo_role=${role}; path=/; max-age=${maxAge}`;
    document.cookie = `demo_auth=1; path=/; max-age=${maxAge}`;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (!passwordAuth) {
      const role = roleFromLoginEmail(email);
      if (!role) {
        setMessage(
          "Use a role email such as admin@vegpro.com, manager@vegpro.com, or worker@vegpro.com.",
        );
        return;
      }
      if (rememberMe) saveLoginPrefs(email, true, demoLoginRoleFromRole(role));
      setDemoCookies(role);
      goToDashboard(role);
      return;
    }

    setBusy(true);
    const result = await signInWithPasswordAction(email, password);
    if (!result.ok) {
      setMessage(result.error);
      setBusy(false);
      return;
    }

    saveLoginPrefs(email, rememberMe, demoLoginRoleFromRole(result.role));
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
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Email</span>
            <input
              className="w-full rounded-lg border border-border bg-background p-3 text-base"
              placeholder="admin@vegpro.com"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!prefsLoaded || busy}
              required
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
            Demo mode — try admin@vegpro.com, manager@vegpro.com, or worker@vegpro.com
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
