import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Configure compiler options
  compiler: {
    // Enable styled-components support
    styledComponents: true,
  },
  // Server external packages
  serverExternalPackages: [
    "mammoth",
    "xlsx",
    "@xenova/transformers",
    "llamaindex",
  ],
  // Experimental features
  experimental: {
    serverActions: {
      // Increase body size limit to 50MB for file uploads
      bodySizeLimit: "50mb",
    },
    // Constrain file tracing to project root to avoid scanning Windows junctions
    outputFileTracingRoot: path.resolve(__dirname),
    // Exclude problematic Windows junction directories that can cause EPERM
    outputFileTracingExcludes: {
      "*": [
        "**/Application Data/**",
        "**/AppData/**",
      ],
    },
  },
  // Allow cross-origin requests from demo.lushaimedia.in
  allowedDevOrigins: ["demo.lushaimedia.in"],
  // Add timeout configurations
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "X-Response-Time",
            value: "300000", // 5 minutes
          },
        ],
      },
    ];
  },
  // Increase server timeout
  serverRuntimeConfig: {
    // Increase timeout for API routes
    maxDuration: 300, // 5 minutes
  },
  // Performance optimizations
  poweredByHeader: false,
  compress: true,
  // Increase memory limit for large queries
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Server-side specific configuration
      // Handle server-side rendering issues with browser globals
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        // Add fallbacks for browser globals that might be referenced
        global: false,
        globalThis: false,
      };

      // Disable problematic optimizations for server-side
      config.optimization = {
        ...config.optimization,
        splitChunks: false, // Disable chunk splitting for server
      };
    } else {
      // Client-side configuration
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }
    return config;
  },
};

export default nextConfig;
