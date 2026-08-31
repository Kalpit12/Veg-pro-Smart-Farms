"use client";

import { useEffect } from "react";

/** Prevents stale PWA service workers from breaking auth fetch and HMR. */
export function DevSwCleanup() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (!("serviceWorker" in navigator)) return;

    void (async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const hadWorker =
        registrations.length > 0 || Boolean(navigator.serviceWorker.controller);

      await Promise.all(registrations.map((registration) => registration.unregister()));

      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }

      if (hadWorker && sessionStorage.getItem("vegpro-sw-cleared") !== "1") {
        sessionStorage.setItem("vegpro-sw-cleared", "1");
        window.location.reload();
      }
    })();
  }, []);

  return null;
}
