import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // FastAPI defines its collection routes with a trailing slash (/customers/).
  // Without this, Next 308-redirects /api/customers/ to /api/customers before
  // the proxy route sees it, costing an extra redirect hop on every call.
  skipTrailingSlashRedirect: true,

  // Traces only the files actually needed to run the server, instead of
  // shipping the full node_modules tree — cuts the image from ~1GB to
  // ~150-200MB. Pairs with the multi-stage build in Dockerfile, which copies
  // .next/standalone instead of running `next start` against node_modules.
  output: "standalone",
};

export default nextConfig;
