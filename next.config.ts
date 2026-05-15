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
}

export default nextConfig
