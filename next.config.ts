import type { NextConfig } from 'next'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8080'

const nextConfig: NextConfig = {
  // Images from the Go API
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8080',
        pathname: '/api/v1/**',
      },
    ],
  },

  /**
   * Proxy /api/proxy/* → backend to avoid browser CORS restrictions.
   * The browser only talks to localhost:3000; Next.js server forwards the
   * request server-side where CORS does not apply.
   */
  async rewrites() {
    return [
      // Auth endpoints live at /api/auth/* on the backend.
      {
        source: '/api/auth/:path*',
        destination: `${BACKEND_URL}/api/auth/:path*`,
      },
      // All other API calls go through /api/v1.
      {
        source: '/api/proxy/:path*',
        destination: `${BACKEND_URL}/api/v1/:path*`,
      },
    ]
  },
}

export default nextConfig
