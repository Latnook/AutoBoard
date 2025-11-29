/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  experimental: {
    optimizePackageImports: ['@microsoft/microsoft-graph-client', 'googleapis'],
  },
};

export default nextConfig;
