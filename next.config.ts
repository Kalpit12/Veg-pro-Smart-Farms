import type { NextConfig } from "next";
import withPWAInit from "next-pwa";
import defaultRuntimeCaching from "next-pwa/cache.js";

/**
 * Worker pages (HTML) for offline field work: try the network for a few
 * seconds (weak data bundles), then serve the last cached copy.
 * Must be self-contained — it is serialized into public/sw.js.
 */
/**
 * Offline + page not cached: open the cached worker Field work page instead.
 * Plain promises (no async/await): next.config.ts is transpiled and async helpers
 * would not exist inside the service worker.
 */
const offlineWorkerFallback = {
  handlerDidError: () =>
    caches
      .match("/worker/field", { ignoreVary: true })
      .then((hit) => hit || caches.match("/worker/dashboard", { ignoreVary: true }))
      .then((hit) => hit || Response.error()),
};

/** App icon opens "/" (a redirect) — offline it must still land on field work. */
const startUrlCache = {
  urlPattern: ({ request, url }: { request: Request; url: URL }) =>
    self.origin === url.origin &&
    request.mode === "navigate" &&
    (url.pathname === "/" || url.pathname === "/worker"),
  handler: "NetworkFirst",
  options: {
    cacheName: "worker-start",
    networkTimeoutSeconds: 5,
    cacheableResponse: { statuses: [200] },
    plugins: [offlineWorkerFallback],
  },
};

const workerPagesCache = {
  urlPattern: ({ request, url }: { request: Request; url: URL }) =>
    self.origin === url.origin &&
    request.method === "GET" &&
    url.pathname.startsWith("/worker") &&
    !url.searchParams.has("_rsc"),
  handler: "NetworkFirst",
  options: {
    cacheName: "worker-pages",
    networkTimeoutSeconds: 5,
    // Next.js sends Vary: RSC, Accept-Encoding… — ignore it so warmed pages match navigations.
    matchOptions: { ignoreVary: true },
    expiration: { maxEntries: 20, maxAgeSeconds: 7 * 24 * 60 * 60 },
    plugins: [offlineWorkerFallback],
  },
};

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  // Replaced by startUrlCache above (default caches the "/" redirect as an empty page).
  cacheStartUrl: false,
  dynamicStartUrl: false,
  runtimeCaching: [startUrlCache, workerPagesCache, ...defaultRuntimeCaching],
  // Next 15 does not serve /_next/app-build-manifest.json (404). If it is precached the
  // service worker install fails and offline mode never activates.
  buildExcludes: [/app-build-manifest\.json$/],
  // next-pwa + webpack watch triggers noisy GenerateSW warnings in dev
  disable:
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_DISABLE_PWA === "true",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["mssql", "msnodesqlv8"],
  // IIS reverse-proxies to 127.0.0.1:3000; allow public host for Server Actions (Next 15.5).
  experimental: {
    serverActions: {
      allowedOrigins: [
        "scouting.kongoniriverfarm.com",
        "127.0.0.1:3000",
        "localhost:3000",
        "localhost:3001",
        "127.0.0.1:3001",
      ],
    },
  },
  // Demo deploys should not be blocked by lint-only warnings (e.g. unused vars).
  eslint: {
    ignoreDuringBuilds: true,
  },
  // FDB production uses MSSQL only; allow deploy while Supabase-only paths are type-checked separately.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default withPWA(nextConfig);
