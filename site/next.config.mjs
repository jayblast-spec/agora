import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const siteDir = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "/agora",
  assetPrefix: "/agora",
  trailingSlash: true,
  images: { unoptimized: true },
  // The library lockfile lives one directory up. Trace this site only.
  outputFileTracingRoot: siteDir,
};

export default nextConfig;
