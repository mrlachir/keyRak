import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker runs the generated server.js; Vercel keeps its standard output.
  output: process.env.NEXT_BUILD_OUTPUT === "standalone" ? "standalone" : undefined,
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
