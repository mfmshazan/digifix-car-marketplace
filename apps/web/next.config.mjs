/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Canonical account settings URL is /settings. Some Docker/volume setups failed to
  // register the deep nested route; keep a redirect so old links still work.
  async redirects() {
    return [
      {
        source: '/dashboard/customer/settings',
        destination: '/settings',
        permanent: false,
      },
      {
        source: '/dashboard/customer',
        destination: '/dashboard/admin',
        permanent: false,
      },
    ];
  },
  // Enable hot-reload in Docker on Windows
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  },
};

export default nextConfig;
