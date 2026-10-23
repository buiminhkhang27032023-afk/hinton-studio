/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, ""),
  distDir: process.env.NEXT_DIST_DIR || ".next",
  outputFileTracingRoot: process.cwd(),
  reactStrictMode: true,
  serverExternalPackages: ["node:sqlite"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // The floating dev indicator overlapped the sidebar logo.
  devIndicators: false,
  // The dev overlay badge sits on top of the sidebar footer in this layout.
  experimental: { devtoolSegmentExplorer: false },
};

export default nextConfig;
