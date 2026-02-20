import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: 'https',
        hostname: 'images.igdb.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: "https",
        hostname: "", // Permite qualquer domínio (útil para desenvolvimento, mas deve ser restrito em produção)
        port: "",
        pathname: "/**",
      }
    ],
  },
};

export default nextConfig;
