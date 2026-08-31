const EMAIL_KEY = "vegpro_login_email";
const REMEMBER_KEY = "vegpro_remember_me";
const DEMO_ROLE_KEY = "vegpro_demo_role";

export type DemoLoginRole = "worker" | "supervisor" | "admin";

export function loadLoginPrefs() {
  if (typeof window === "undefined") {
    return { email: "", rememberMe: true, demoRole: "worker" as const };
  }

  const rememberMe = localStorage.getItem(REMEMBER_KEY) !== "false";
  const email = rememberMe ? (localStorage.getItem(EMAIL_KEY) ?? "") : "";
  const storedRole = localStorage.getItem(DEMO_ROLE_KEY);
  const demoRole: DemoLoginRole =
    storedRole === "supervisor"
      ? "supervisor"
      : storedRole === "admin"
        ? "admin"
        : "worker";

  return { email, rememberMe, demoRole };
}

export function saveLoginPrefs(
  email: string,
  rememberMe: boolean,
  demoRole?: DemoLoginRole,
) {
  localStorage.setItem(REMEMBER_KEY, String(rememberMe));
  if (rememberMe) {
    localStorage.setItem(EMAIL_KEY, email.trim());
    if (demoRole) localStorage.setItem(DEMO_ROLE_KEY, demoRole);
  } else {
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem(DEMO_ROLE_KEY);
  }
}

export function clearLoginPrefs() {
  localStorage.removeItem(EMAIL_KEY);
  localStorage.removeItem(REMEMBER_KEY);
  localStorage.removeItem(DEMO_ROLE_KEY);
}
