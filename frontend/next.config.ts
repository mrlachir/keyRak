import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "standalone",  <-- Comment this out or delete it!
  experimental: {
    serverActions: {
      bodySizeLimit: "160mb", 
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost", port: "8080", pathname: "/**" },
    ],
  },
};

export default nextConfig;