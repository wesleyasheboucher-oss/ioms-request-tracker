import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page here shows live, per-user data, so we render per request
  // instead of using Cache Components.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
