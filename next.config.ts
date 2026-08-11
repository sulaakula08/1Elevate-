import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The development badge overlaps the full-screen exam footer. Runtime and
  // compilation errors are still shown by Next.js when this indicator is off.
  devIndicators: false,
  // A stray lockfile in the user's home directory makes Next infer the wrong
  // workspace root; pin it to this project.
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;
