/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  onDemandEntries: {
    maxInactiveAge: 30 * 60 * 1000,
    pagesBufferLength: 8,
  },
  experimental: {
    serverComponentsExternalPackages: ['bullmq', 'ioredis', 'exceljs', 'pdfkit', '@node-saml/node-saml'],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.output = {
        ...config.output,
        chunkLoadTimeout: 300000,
      };
      config.watchOptions = {
        ...(config.watchOptions ?? {}),
        ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**', '**/supabase/.temp/**'],
      };
    }
    return config;
  },
};

export default nextConfig;
