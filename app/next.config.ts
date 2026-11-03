import type { NextConfig } from "next";

// موقع ثابت على GitHub Pages تحت المسار /Serah
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/Serah";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
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
