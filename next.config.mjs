/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  experimental: {
    optimizePackageImports: ['@microsoft/microsoft-graph-client', 'googleapis', 'swr', 'next-auth'],
    // Faster server startup
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Turbopack configuration (faster than webpack)
  turbopack: {},

  // Faster development
  transpilePackages: ['next-auth'],

  // Development optimizations
  onDemandEntries: {
    // Extend the time routes stay in memory
    maxInactiveAge: 60 * 1000,
    // Reduce pages kept in memory
    pagesBufferLength: 2,
  },

  // Production optimizations
  poweredByHeader: false,
  compress: true,

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
};

export default nextConfig;
