import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  async headers() {
    return [
      {
        source: "/admin/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
