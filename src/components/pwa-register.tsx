"use client";

import { useEffect } from "react";

/** Worker pages to keep in the offline cache while the phone has signal. */
const WARM_URLS = ["/worker/field", "/worker/dashboard"];

/**
 * Registers the PWA service worker (public/sw.js).
 *
 * next-pwa 5.x only injects its auto-register script into the Pages Router
 * `main.js` bundle. App Router pages load `main-app.js`, so the worker was
 * never registered and the app could not open without internet. This
 * registers it explicitly and pre-caches the worker pages for offline use.
 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (process.env.NEXT_PUBLIC_DISABLE_PWA === "true") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let cancelled = false;

    const warmCache = async () => {
      if (!navigator.onLine) return;
      for (const url of WARM_URLS) {
        if (cancelled) return;
        try {
          // Goes through the service worker, which stores the page for offline.
          await fetch(url, { credentials: "same-origin", cache: "no-store" });
        } catch {
          /* offline / flaky signal — try again next visit */
        }
      }
    };

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;
        // Wait until the worker controls this page so the warm-up fetches are cached.
        if (!navigator.serviceWorker.controller) {
          await new Promise<void>((resolve) => {
            const done = () => resolve();
            navigator.serviceWorker.addEventListener("controllerchange", done, { once: true });
            setTimeout(done, 5000);
          });
        }
        await warmCache();
      } catch {
        /* registration failed (e.g. not HTTPS) — app still works online */
      }
    };

    if (document.readyState === "complete") {
      void register();
    } else {
      const onLoad = () => void register();
      window.addEventListener("load", onLoad, { once: true });
      return () => {
        cancelled = true;
        window.removeEventListener("load", onLoad);
      };
    }

    const onOnline = () => void warmCache();
    window.addEventListener("online", onOnline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return null;
}
