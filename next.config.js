/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output memudahkan migrasi dari Vercel ke Hostinger (Node.js server)
  output: "standalone",
};

module.exports = nextConfig;
