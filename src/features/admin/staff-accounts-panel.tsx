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
import { FarmGreenhouseAccessPicker } from "@/features/admin/farm-greenhouse-access-picker";
import { setStaffAccountActiveAction } from "@/features/admin/set-staff-active-action";
import {
  getSupervisorGreenhouseAccessAction,
  listFarmsGreenhousesCatalogAction,
  setSupervisorGreenhouseAccessAction,
  type FarmGreenhouseCatalogItem,
} from "@/features/admin/supervisor-access-actions";
import { getSessionAction } from "@/features/auth/sign-in-action";
import { hasConfiguredBackend, hasMssqlEnv, hasSupabaseEnv } from "@/lib/data-backend";
import { createClient } from "@/lib/supabase/client";
import { listStaffAccountsAction } from "@/features/admin/list-staff-accounts-action";
import { updateStaffAccountAction } from "@/features/admin/update-staff-account-action";
import type { StaffAccountRow } from "@/services/supabase/staff-service";
import type { Role } from "@/types/db";

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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState<{
    email: string;
    password: string;
    role: StaffAccountRole;
  } | null>(null);
  const [siteCatalog, setSiteCatalog] = useState<FarmGreenhouseCatalogItem[]>([]);
  const [createGreenhouseIds, setCreateGreenhouseIds] = useState<string[]>([]);
  const [accessEdit, setAccessEdit] = useState<{
    userId: string;
    name: string;
    ids: string[];
  } | null>(null);
  const [accessBusy, setAccessBusy] = useState(false);
  const [profileEdit, setProfileEdit] = useState<{
    userId: string;
    fullName: string;
    email: string;
    phone: string;
    password: string;
  } | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);

  const refreshAccounts = useCallback(async () => {
    if (!hasConfiguredBackend()) {
      setAccounts([]);
      setLoadingList(false);
      return;
    }
    setLoadingList(true);
    const { data, error } = await listStaffAccountsAction();
    if (error) {
      toast({
        title: "Could not load staff",
        description: error.message,
        tone: "error",
      });
      setAccounts([]);
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
    void (async () => {
      if (hasMssqlEnv()) {
        const session = await getSessionAction();
        if (session) {
          setCurrentUserId(session.id);
          setCurrentRole(session.role);
        }
        return;
      }
      if (!hasSupabaseEnv()) return;
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      setCurrentUserId(data.user.id);
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", data.user.id)
        .single();
      if (profile?.role) setCurrentRole(profile.role as Role);
    })();
    void refreshAccounts();
  }, [refreshAccounts]);

  useEffect(() => {
    if (currentRole !== "admin" || !hasConfiguredBackend()) return;
    void listFarmsGreenhousesCatalogAction().then((result) => {
      if (result.error) {
        toast({
          title: "Could not load farms",
          description: result.error.message,
          tone: "error",
        });
        return;
      }
      setSiteCatalog(result.data);
    });
  }, [currentRole, toast]);

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
        greenhouseIds:
          role === "supervisor" || role === "worker" ? createGreenhouseIds : undefined,
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
      setCreateGreenhouseIds([]);
      await refreshAccounts();
    } finally {
      setBusy(false);
    }
  };

  const onToggleActive = async (row: StaffAccountRow, nextActive: boolean) => {
    if (statusBusyId) return;
    setStatusBusyId(row.id);
    try {
      const result = await setStaffAccountActiveAction(row.id, nextActive);
      if (!result.ok) {
        toast({
          title: nextActive ? "Could not activate" : "Could not deactivate",
          description: result.error,
          tone: "error",
        });
        return;
      }
      toast({
        title: nextActive ? "Account activated" : "Account deactivated",
        description: nextActive
          ? `${row.full_name} can sign in again.`
          : `${row.full_name} can no longer sign in until reactivated.`,
        tone: "success",
      });
      await refreshAccounts();
    } finally {
      setStatusBusyId(null);
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

  const canManageStatus = currentRole === "admin";

  const openAccessEditor = async (row: StaffAccountRow) => {
    const { data, error } = await getSupervisorGreenhouseAccessAction(row.id);
    if (error) {
      toast({ title: "Could not load sites", description: error.message, tone: "error" });
      return;
    }
    setAccessEdit({ userId: row.id, name: row.full_name, ids: data });
  };

  const openProfileEditor = (row: StaffAccountRow) => {
    setProfileEdit({
      userId: row.id,
      fullName: row.full_name,
      email: row.email,
      phone: row.phone ?? "",
      password: "",
    });
  };

  const saveProfileEditor = async () => {
    if (!profileEdit || profileBusy) return;
    setProfileBusy(true);
    try {
      const result = await updateStaffAccountAction({
        userId: profileEdit.userId,
        fullName: profileEdit.fullName,
        email: profileEdit.email,
        phone: profileEdit.phone,
        password: profileEdit.password.trim() || undefined,
      });
      if (!result.ok) {
        toast({ title: "Could not save profile", description: result.error, tone: "error" });
        return;
      }
      toast({ title: "Profile updated", tone: "success" });
      setProfileEdit(null);
      await refreshAccounts();
    } finally {
      setProfileBusy(false);
    }
  };

  const saveAccessEditor = async () => {
    if (!accessEdit || accessBusy) return;
    setAccessBusy(true);
    try {
      const result = await setSupervisorGreenhouseAccessAction(
        accessEdit.userId,
        accessEdit.ids,
      );
      if (!result.ok) {
        toast({ title: "Could not save sites", description: result.error, tone: "error" });
        return;
      }
      toast({
        title: "Sites updated",
        description: `${accessEdit.name} now sees ${accessEdit.ids.length} greenhouse(s).`,
        tone: "success",
      });
      setAccessEdit(null);
    } finally {
      setAccessBusy(false);
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
              Admins can add field workers and farm managers. For farm managers, choose which
              farms and greenhouses they can monitor.
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
                { value: "admin", label: "Admin" },
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
          {role === "supervisor" || role === "worker" ? (
            <div className="space-y-2 sm:col-span-2">
              <p className="text-sm font-medium">
                Farms &amp; greenhouses this {role === "worker" ? "worker" : "manager"} can see
              </p>
              <FarmGreenhouseAccessPicker
                catalog={siteCatalog}
                value={createGreenhouseIds}
                onChange={setCreateGreenhouseIds}
                disabled={busy || !canCreate}
              />
            </div>
          ) : null}
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

      <div className="glass-card rounded-2xl">
        <h3 className="border-b border-border/70 bg-muted/30 px-4 py-3 text-sm font-semibold">
          Staff directory
        </h3>
        {loadingList ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Loading accounts…</p>
        ) : !accounts.length ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No staff accounts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border/70 text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Role</th>
                  <th className="px-4 py-2 font-medium">Phone</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  {canManageStatus ? (
                    <>
                      <th className="px-4 py-2 font-medium">Monitored sites</th>
                      <th className="px-4 py-2 font-medium">Profile</th>
                      <th className="px-4 py-2 font-medium">Account</th>
                    </>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {accounts.map((row) => {
                  const active = row.is_active !== false;
                  const isSelf = currentUserId === row.id;
                  return (
                    <tr key={row.id} className="border-b border-border/50">
                      <td className="px-4 py-3 font-medium">{row.full_name}</td>
                      <td className="px-4 py-3">{row.email}</td>
                      <td className="px-4 py-3">{roleLabel(row.role)}</td>
                      <td className="px-4 py-3">{row.phone ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            active
                              ? "inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"
                              : "inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                          }
                        >
                          {active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      {canManageStatus ? (
                        <>
                          <td className="px-4 py-3">
                            {row.role === "supervisor" || row.role === "worker" ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => void openAccessEditor(row)}
                              >
                                Edit sites
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => openProfileEditor(row)}
                            >
                              Edit
                            </Button>
                          </td>
                          <td className="px-4 py-3">
                            {isSelf ? (
                              <span className="text-xs text-muted-foreground">Your account</span>
                            ) : (
                              <Button
                                type="button"
                                variant={active ? "outline" : "default"}
                                size="sm"
                                disabled={statusBusyId === row.id}
                                onClick={() => void onToggleActive(row, !active)}
                              >
                                {statusBusyId === row.id
                                  ? "Saving…"
                                  : active
                                    ? "Deactivate"
                                    : "Activate"}
                              </Button>
                            )}
                          </td>
                        </>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {profileEdit ? (
        <div className="glass-card space-y-3 rounded-2xl border border-primary/30 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">Edit staff profile</h3>
              <p className="text-xs text-muted-foreground">
                Update name, email, phone, or set a new password (leave blank to keep current).
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setProfileEdit(null)}>
              Close
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-sm font-medium">Full name</span>
              <input
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5"
                value={profileEdit.fullName}
                onChange={(e) =>
                  setProfileEdit((p) => (p ? { ...p, fullName: e.target.value } : p))
                }
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Email</span>
              <input
                type="email"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5"
                value={profileEdit.email}
                onChange={(e) =>
                  setProfileEdit((p) => (p ? { ...p, email: e.target.value } : p))
                }
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Phone</span>
              <input
                type="tel"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5"
                value={profileEdit.phone}
                onChange={(e) =>
                  setProfileEdit((p) => (p ? { ...p, phone: e.target.value } : p))
                }
              />
            </label>
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-sm font-medium">New password (optional)</span>
              <input
                type="text"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm"
                value={profileEdit.password}
                onChange={(e) =>
                  setProfileEdit((p) => (p ? { ...p, password: e.target.value } : p))
                }
                minLength={8}
                placeholder="Leave blank to keep current password"
                autoComplete="new-password"
              />
            </label>
          </div>
          <Button type="button" disabled={profileBusy} onClick={() => void saveProfileEditor()}>
            {profileBusy ? "Saving…" : "Save profile"}
          </Button>
        </div>
      ) : null}

      {accessEdit ? (
        <div className="glass-card space-y-3 rounded-2xl border border-primary/30 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">Monitored sites — {accessEdit.name}</h3>
              <p className="text-xs text-muted-foreground">
                Only selected greenhouses (and their farms) appear in this farm manager&apos;s
                dashboards and maps.
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setAccessEdit(null)}>
              Close
            </Button>
          </div>
          <FarmGreenhouseAccessPicker
            catalog={siteCatalog}
            value={accessEdit.ids}
            onChange={(ids) => setAccessEdit((prev) => (prev ? { ...prev, ids } : prev))}
            disabled={accessBusy}
          />
          <Button type="button" disabled={accessBusy} onClick={() => void saveAccessEditor()}>
            {accessBusy ? "Saving…" : "Save sites"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
