/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverComponentsExternalPackages: ['bullmq', 'ioredis', 'exceljs', 'pdfkit'],
  },
};

export default nextConfig;
