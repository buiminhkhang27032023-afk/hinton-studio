const ROOT_RE = process.cwd().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
  experimental: {
    devtoolSegmentExplorer: false,
    // Tree-shake heavy icon/3D libs so each page ships less JS.
    optimizePackageImports: ["lucide-react", "three", "gsap", "@xyflow/react"],
  },
  // data/ (24GB of renders), outputs and temp folders must never be watched.
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        // Root-anchored so app/(studio)/models etc. are still watched.
        ignored: new RegExp(
          "[\\\\/](node_modules|\\.git|\\.next|\\.next-deploy-check)[\\\\/]|^" +
            ROOT_RE +
            "[\\\\/](data|output|outputs|output_lookbooks|scratch_tryon|fashion_sources|insightface_models|models|KHE-SANG|skill-packages|deploy|\\.tmp|temp_[^\\\\/]+)[\\\\/]",
          "i",
        ),
      };
    }
    return config;
  },
};

export default nextConfig;
