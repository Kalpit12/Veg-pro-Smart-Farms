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
  // Demo deploys should not be blocked by lint-only warnings (e.g. unused vars).
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default withPWA(nextConfig);
