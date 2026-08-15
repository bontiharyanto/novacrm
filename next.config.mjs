/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 2,
  },
  experimental: {
    serverComponentsExternalPackages: ['bullmq', 'ioredis', 'exceljs', 'pdfkit', '@node-saml/node-saml'],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...(config.watchOptions ?? {}),
        ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**', '**/supabase/.temp/**'],
      };
    }
    return config;
  },
};

export default nextConfig;
