import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: { root: __dirname },
  // Food photos are resized in the browser (~1024 px JPEG) before upload; 2 MB leaves headroom
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
};

export default nextConfig;
