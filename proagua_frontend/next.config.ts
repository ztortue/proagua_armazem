/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.0.79",
    "192.168.0.233",
  ],
  reactCompiler: true,
  reactStrictMode: false,
};

export default nextConfig;
