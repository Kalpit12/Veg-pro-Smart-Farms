"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, RefreshCw, UserPlus } from "lucide-react";

import { AppSelect } from "@/components/ui/app-select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  createStaffAccountAction,
  getStaffProvisioningStatus,
  type StaffAccountRole,
} from "@/features/admin/create-staff-account-action";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import {
  listStaffAccounts,
  type StaffAccountRow,
} from "@/services/supabase/staff-service";

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function roleLabel(role: string) {
  if (role === "supervisor") return "Farm manager";
  if (role === "admin") return "Admin";
  return "Field worker";
}

export function StaffAccountsPanel() {
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<StaffAccountRole>("worker");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  const [canCreate, setCanCreate] = useState(false);
  const [accounts, setAccounts] = useState<StaffAccountRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [lastCreated, setLastCreated] = useState<{
    email: string;
    password: string;
    role: StaffAccountRole;
  } | null>(null);

  const refreshAccounts = useCallback(async () => {
    if (!hasSupabaseEnv()) {
      setAccounts([]);
      setLoadingList(false);
      return;
    }
    const { data, error } = await listStaffAccounts();
    if (error) {
      toast({
        title: "Could not load staff",
        description: error.message,
        tone: "error",
      });
    } else {
      setAccounts((data ?? []) as StaffAccountRow[]);
    }
    setLoadingList(false);
  }, [toast]);

  useEffect(() => {
    setPassword(generatePassword());
  }, []);

  useEffect(() => {
    void getStaffProvisioningStatus().then((s) => {
      setCanCreate(s.canCreate);
      setSetupMessage(s.message);
    });
    void refreshAccounts();
  }, [refreshAccounts]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setLastCreated(null);
    try {
      const result = await createStaffAccountAction({
        fullName,
        email,
        phone,
        role,
        password,
      });
      if (!result.ok) {
        toast({ title: "Account not created", description: result.error, tone: "error" });
        return;
      }
      setLastCreated({ email: result.email, password, role: result.role });
      toast({
        title: `${roleLabel(result.role)} created`,
        description: `${result.fullName} can sign in with ${result.email}. Copy the password now — it is not stored.`,
        tone: "success",
      });
      setFullName("");
      setEmail("");
      setPhone("");
      setPassword(generatePassword());
      await refreshAccounts();
    } finally {
      setBusy(false);
    }
  };

  const copyPassword = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: "Password copied", tone: "success" });
    } catch {
      toast({ title: "Copy failed", description: "Select the password and copy it manually.", tone: "error" });
    }
  };

  return (
    <section className="space-y-4">
      <div className="glass-card space-y-4 rounded-2xl p-4">
        <div className="flex items-start gap-2">
          <UserPlus className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Create staff accounts</h2>
            <p className="text-sm text-muted-foreground">
              Admins can add field workers and farm managers. They sign in on the matching
              Role at login (Field worker or Farm manager).
            </p>
          </div>
        </div>

        {setupMessage ? (
          <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
            {setupMessage}
          </p>
        ) : null}

        <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => void onSubmit(e)}>
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-sm font-medium">Full name</span>
            <input
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-base"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="off"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Email (login)</span>
            <input
              type="email"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-base"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="off"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Phone (optional)</span>
            <input
              type="tel"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-base"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="off"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Role</span>
            <AppSelect
              aria-label="Staff role"
              value={role}
              onChange={(next) => setRole(next as StaffAccountRole)}
              options={[
                { value: "worker", label: "Field worker" },
                { value: "supervisor", label: "Farm manager" },
              ]}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Temporary password</span>
            <div className="flex gap-2">
              <input
                type="text"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Generate password"
                onClick={() => setPassword(generatePassword())}
              >
                <RefreshCw className="size-4" />
              </Button>
            </div>
          </label>
          <div className="flex items-end sm:col-span-2">
            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={busy || !canCreate}>
              {busy ? "Creating…" : "Create account"}
            </Button>
          </div>
        </form>

        {lastCreated ? (
          <p className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
            <span>
              Give this to {lastCreated.email} ({roleLabel(lastCreated.role)}):{" "}
              <span className="font-mono font-medium">{lastCreated.password}</span>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void copyPassword(lastCreated.password)}
            >
              <Copy className="mr-1 size-3.5" />
              Copy
            </Button>
          </p>
        ) : null}
      </div>

      <div className="glass-card overflow-hidden rounded-2xl">
        <h3 className="border-b border-border/70 bg-muted/30 px-4 py-3 text-sm font-semibold">
          Staff directory
        </h3>
        {loadingList ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Loading accounts…</p>
        ) : !accounts.length ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No staff accounts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-border/70 text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Role</th>
                  <th className="px-4 py-2 font-medium">Phone</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((row) => (
                  <tr key={row.id} className="border-b border-border/50">
                    <td className="px-4 py-3 font-medium">{row.full_name}</td>
                    <td className="px-4 py-3">{row.email}</td>
                    <td className="px-4 py-3">{roleLabel(row.role)}</td>
                    <td className="px-4 py-3">{row.phone ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
