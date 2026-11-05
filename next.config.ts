import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't advertise the framework version to the internet.
  poweredByHeader: false,
  compress: true,
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
