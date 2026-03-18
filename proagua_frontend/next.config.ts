/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.0.79",
    "192.168.0.233",
    "192.168.56.103",
  ],
  reactCompiler: true,
  reactStrictMode: false,
  async rewrites() {
    // Proxy /api/* → backend when running Next.js directly (without Nginx)
    // In Docker behind Nginx, Nginx handles this routing instead.
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
