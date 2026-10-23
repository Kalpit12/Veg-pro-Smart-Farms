const STORAGE_KEY = "vegpro-offline-field-user";

export type OfflineFieldUser = {
  id: string;
  email: string;
};

export function rememberOfflineFieldUser(user: OfflineFieldUser) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch {
    /* quota / private mode */
  }
}

export function getOfflineFieldUser(): OfflineFieldUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OfflineFieldUser;
    if (typeof parsed?.id === "string" && parsed.id.length > 0) return parsed;
  } catch {
    return null;
  }
  return null;
}

export function clearOfflineFieldUser() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
