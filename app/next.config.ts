import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['argon2', 'postgres'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // product image uploads go through server actions
    },
  },
};

export default nextConfig;
