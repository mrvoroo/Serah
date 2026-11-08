import type { NextConfig } from "next";
import { mkdirSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

// موقع ثابت على GitHub Pages تحت المسار /Serah
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/Serah";
// رقم النسخة: يُكتب في public/version.json، والتطبيق يقارنه برقمه ليعرض زر «حدّث الآن» (dev = بدون فحص)
// (ثابت في كل عمليات البناء: رقم الـ commit، وليس الوقت)
const isBuild = process.env.NODE_ENV === "production";
const gitSha = () => { try { return execSync("git rev-parse --short=12 HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return "local"; } };
const buildId = isBuild ? (process.env.GITHUB_SHA?.slice(0, 12) || gitSha()) : "dev";
if (isBuild) { mkdirSync("public", { recursive: true }); writeFileSync("public/version.json", JSON.stringify({ build: buildId })); }

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath, NEXT_PUBLIC_BUILD_ID: buildId },
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
