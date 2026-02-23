import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.discordapp.com", port: "", pathname: "/**" },
      { protocol: "https", hostname: "lh3.googleusercontent.com", port: "", pathname: "/**" },
      { protocol: 'https', hostname: 'images.igdb.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'shared.akamai.steamstatic.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'cdn2.steamgriddb.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'cdn3.steamgriddb.com', port: '', pathname: '/**', },
      { protocol: 'https', hostname: 'shared.akamai.steamstatic.com', port: '', pathname: '/**', },
      { protocol: 'https', hostname: 'avatars.steamstatic.com', port: '', pathname: '/**', },
    ],
  },
};

export default nextConfig;