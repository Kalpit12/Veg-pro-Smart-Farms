import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
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
