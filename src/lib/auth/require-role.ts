import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ROLE_ROUTES } from "@/lib/constants";
import type { Role } from "@/types/db";
import { getServerDataBackend } from "@/lib/data-backend";
import { getSessionFromCookies } from "@/lib/auth/session";

export async function requireRole(allowed: Role[]) {
  const backend = getServerDataBackend();

  if (backend === "mssql") {
    const session = await getSessionFromCookies();
    if (!session) redirect("/auth/login");
    const role = session.role;
    if (!allowed.includes(role)) {
      redirect(ROLE_ROUTES[role]);
    }
    return { user: { id: session.sub, email: session.email }, role };
  }

  if (backend === "demo") {
    const cookieStore = await cookies();
    const role = (cookieStore.get("demo_role")?.value ?? "worker") as Role;
    if (!allowed.includes(role)) {
      redirect(ROLE_ROUTES[role]);
    }
    return { user: null, role };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role ?? "worker") as Role;
  if (!allowed.includes(role)) {
    redirect(ROLE_ROUTES[role]);
  }

  return { user, role };
}
