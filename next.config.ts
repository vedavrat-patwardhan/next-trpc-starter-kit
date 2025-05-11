import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable edge runtime for API routes
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-API-KEY, Content-Type, Authorization',
          },
        ],
      },
    ];
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  redirects: async () => {
    return [
      {
        source: '/',
        destination: '/auth/sign-in',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
