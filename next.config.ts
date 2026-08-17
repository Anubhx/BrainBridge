import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // Only activate the service worker in production
  disable: process.env.NODE_ENV !== "production",
});

const nextConfig: NextConfig = {
  // Empty turbopack config suppresses the "webpack config with no turbopack
  // config" error in Next.js 16, while still letting @serwist/next inject
  // its webpack plugin. Serwist Turbopack support is tracked at:
  // https://github.com/serwist/serwist/issues/54
  turbopack: {},
};

export default withSerwist(nextConfig);
