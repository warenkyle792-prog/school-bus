import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Keep production builds out of `.next` while a dev server is running.
   * Building into the same directory the dev server serves from silently
   * corrupts its client chunks — the page then renders but never hydrates.
   */
  distDir: process.env.SAFIRI_DIST_DIR ?? ".next",
  // Don't advertise the framework version to the internet.
  poweredByHeader: false,
  compress: true,
  /**
   * The app is served through a preview proxy and, in production, a real
   * domain. Next blocks cross-origin dev requests by default, which made the
   * preview host fail to load its own assets.
   */
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    ...(process.env.SAFIRI_ALLOWED_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ?? []),
  ],
  // Polling endpoints must never be cached by a proxy or the browser.
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0, must-revalidate" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
