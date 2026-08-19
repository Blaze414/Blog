import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray lockfile above this directory makes Turbopack guess the wrong root.
  turbopack: { root: path.resolve(".") },
};

export default nextConfig;
