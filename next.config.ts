import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray lockfile in the user's home directory makes Next infer the wrong
  // workspace root; pin it to this project.
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;
