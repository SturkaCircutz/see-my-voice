/** @type {import('next').NextConfig} */
const apiBase = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");

const nextConfig = {
  outputFileTracingRoot: process.cwd(),
  async rewrites() {
    if (!apiBase) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${apiBase}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
