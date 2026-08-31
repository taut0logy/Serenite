import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  // fixes a next-auth/Turbopack module resolution bug (see notes doc)
  transpilePackages: ["next-auth", "@auth/core"],
  // webpack: (config, { isServer }) => {
  //   if (!isServer) {
  //     // Fixes face-api.js / tfjs-image-recognition-base fs module error
  //     config.resolve.fallback = {
  //       ...config.resolve.fallback,
  //       fs: false,
  //       encoding: false,
  //     };
  //   }
  //   return config;
  // },
  // eslint: {
  //   ignoreDuringBuilds: true,
  // },
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
