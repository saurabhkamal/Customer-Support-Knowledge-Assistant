import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // FastAPI defines its collection routes with a trailing slash (/customers/).
  // Without this, Next 308-redirects /api/customers/ to /api/customers before
  // the proxy route sees it, costing an extra redirect hop on every call.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
