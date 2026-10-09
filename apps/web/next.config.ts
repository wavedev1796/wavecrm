import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: process.env.WAVE_NEXT_DIST_DIR ?? '.next',
  poweredByHeader: false,
  // El CSV de contactos llega por server action: 1 MB de archivo más la envoltura multipart.
  experimental: { serverActions: { bodySizeLimit: '2mb' } },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ];
  },
};

export default nextConfig;
