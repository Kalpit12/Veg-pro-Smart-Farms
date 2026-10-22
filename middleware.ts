import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { PUBLIC_ROUTES, ROLE_ALLOWED_PREFIXES, ROLE_ROUTES } from "@/lib/constants";
import type { Role } from "@/types/db";
import { getServerDataBackend } from "@/lib/data-backend";
import { getSessionFromRequest } from "@/lib/auth/session";
import { resolveUserRole, type SupabaseReader } from "@/lib/auth/resolve-user-role";
import { getSupabaseAnonKey } from "@/lib/supabase/config";

export async function middleware(request: NextRequest) {
  // Server Actions POST with Next-Action; avoid redirects / extra auth work on the wire.
  if (request.headers.has("next-action")) {
    return NextResponse.next({ request });
  }

  const backend = getServerDataBackend();

  if (backend === "mssql") {
    const pathname = request.nextUrl.pathname;
    const session = await getSessionFromRequest(request);

    if (PUBLIC_ROUTES.includes(pathname)) {
      return NextResponse.next({ request });
    }

    if (!session) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    const role = session.role;
    if (pathname === "/") {
      return NextResponse.redirect(new URL(ROLE_ROUTES[role], request.url));
    }

    const allowed = ROLE_ALLOWED_PREFIXES[role] ?? ROLE_ALLOWED_PREFIXES.worker;
    const isAllowed = allowed.some((prefix) => pathname.startsWith(prefix));
    if (!isAllowed) {
      return NextResponse.redirect(new URL(ROLE_ROUTES[role], request.url));
    }

    return NextResponse.next({ request });
  }

  if (backend === "demo") {
    const pathname = request.nextUrl.pathname;
    const demoAuth = request.cookies.get("demo_auth")?.value === "1";
    const demoRole = (request.cookies.get("demo_role")?.value ?? "worker") as Role;

    if (PUBLIC_ROUTES.includes(pathname)) {
      return NextResponse.next({ request });
    }

    if (!demoAuth) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    const allowed = ROLE_ALLOWED_PREFIXES[demoRole] ?? ROLE_ALLOWED_PREFIXES.worker;
    const isAllowed = allowed.some((prefix) => pathname.startsWith(prefix));
    if (!isAllowed) {
      return NextResponse.redirect(new URL(ROLE_ROUTES[demoRole], request.url));
    }

    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabaseAnonKey()!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !PUBLIC_ROUTES.includes(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  if (user) {
    const { role, is_active } = await resolveUserRole(
      supabase as unknown as SupabaseReader,
      user.id,
      user,
    );

    if (!is_active) {
      await supabase.auth.signOut();
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("inactive", "1");
      return NextResponse.redirect(loginUrl);
    }
    if (request.nextUrl.pathname === "/") {
      return NextResponse.redirect(new URL(ROLE_ROUTES[role], request.url));
    }

    if (!PUBLIC_ROUTES.includes(request.nextUrl.pathname)) {
      const allowed = ROLE_ALLOWED_PREFIXES[role] ?? ROLE_ALLOWED_PREFIXES.worker;
      const isAllowed = allowed.some((prefix) =>
        request.nextUrl.pathname.startsWith(prefix),
      );
      if (!isAllowed) {
        return NextResponse.redirect(new URL(ROLE_ROUTES[role], request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox-.*\\.js|icon\\.svg|icons/|login-bg\\.jpg).*)",
  ],
};
