import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configure compiler options
  compiler: {
    // Enable styled-components support
    styledComponents: true,
  },
  // Configure webpack to handle Node.js modules in browser
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Handle Node.js modules that are not available in the browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
      };
    }

    return config;
  },
  // Server components external packages
  experimental: {
    serverComponentsExternalPackages: ["mammoth", "xlsx"],
    serverActions: {
      // Increase body size limit to 10MB for file uploads
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
