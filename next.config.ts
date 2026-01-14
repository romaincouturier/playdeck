import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Limite augmentée pour l'upload d'images de cartes
    },
  },
};

export default nextConfig;
