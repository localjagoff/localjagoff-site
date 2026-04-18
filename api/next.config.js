/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  // Prevent Next from trying to statically export dynamic routes
  experimental: {
    appDir: false,
  },

  // Optional but helps avoid weird build issues
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
