/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverComponentsExternalPackages: ['bullmq', 'ioredis', 'exceljs', 'pdfkit', '@node-saml/node-saml'],
  },
};

export default nextConfig;
