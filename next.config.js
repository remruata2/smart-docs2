/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Ignore ESLint during production builds to speed up the process
    // Linting will still happen during development via 'npm run lint'
    ignoreDuringBuilds: true,
  },
  // Increase body size limit for Server Actions to handle larger file uploads
  serverActions: {
    bodySizeLimit: '4mb', // Increased from default 1mb to 4mb
  },
};

module.exports = nextConfig;
