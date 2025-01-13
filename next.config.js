/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/py/:path*",
        destination:
          process.env.NODE_ENV === "development"
            ? "http://127.0.0.1:8000/py/:path*"
            : "/api/",
      },
    ];
  },
  experimental: {
    proxyTimeout: 30000,
  },
};

module.exports = nextConfig;
