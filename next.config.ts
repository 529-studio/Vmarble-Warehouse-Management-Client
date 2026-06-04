import type { NextConfig } from 'next'
import path from 'node:path'

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
   * Proxy rewrites — forward requests to the Go backend without exposing
   * the backend URL to the browser (avoids CORS issues in dev and staging).
   *
   * /api/proxy/:path*  → http://localhost:8080/api/v1/:path*  (apiClient base)
   * /api/auth/:path*   → http://localhost:8080/api/auth/:path* (login, outside /v1)
   *
   * BACKEND_URL is set in .env.local / CI environment. Falls back to :8080 for dev.
   */
  async rewrites() {
    const backend = process.env.BACKEND_URL ?? 'http://localhost:8080'
    return [
      {
        source: '/api/proxy/:path*',
        destination: `${backend}/api/v1/:path*`,
      },
      {
        source: '/api/auth/:path*',
        destination: `${backend}/api/auth/:path*`,
      },
    ]
  },

  /**
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
}

export default nextConfig
