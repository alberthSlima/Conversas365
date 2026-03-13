import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['undici'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lookaside.fbsbx.com',
      },
    ],
    unoptimized: true, // Para desenvolvimento local e imagens da API
  },
};

export default nextConfig;
