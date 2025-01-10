/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/py/:path*",
        destination: "http://127.0.0.1:8000/py/:path*",
      },
    ];
  },
  experimental: {
    proxyTimeout: 30000,
  },
};

module.exports = nextConfig;
