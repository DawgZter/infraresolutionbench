import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const configDirectory = path.dirname(fileURLToPath(import.meta.url));
const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(configDirectory, "../.."),
  outputFileTracingIncludes: {
    "/cases": [
      "../../packages/data/gold_cases/**/*.json",
      "../../artifacts/local-runs/**/*.json",
      "../../artifacts/prime-requests/**/*.json",
      "../../artifacts/prime-responses/**/*.json",
    ],
  },
  ...(basePath
    ? {
        basePath,
        assetPrefix: `${basePath}/`,
      }
    : {}),
  transpilePackages: [
    "@infraresolutionbench/data",
    "@infraresolutionbench/environment",
    "@infraresolutionbench/shared",
  ],
};

export default nextConfig;
