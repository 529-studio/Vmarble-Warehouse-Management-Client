import type { NextConfig } from 'next'
import path from 'node:path'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8080'

const nextConfig: NextConfig = {
  // Enable standalone output for Docker optimization
  output: 'standalone',

  // Pin Turbopack's workspace root to this project. Without this, Turbopack
  // walks up and picks /Users/.../Vmarble-project (which contains a stray
  // package-lock.json) as the root, which then fails to resolve `tailwindcss`.
  turbopack: {
    root: path.resolve(__dirname),
  },

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
   * Security / permissions headers applied to all routes.
   * - Permissions-Policy: allow camera only from same origin (required for
   *   getUserMedia in the kiosk QR scanner on staging).
   * - COOP: same-origin isolates the browsing context for SharedArrayBuffer
   *   and helps enforce Secure Context requirements.
   */
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'camera=(self)',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ]
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
