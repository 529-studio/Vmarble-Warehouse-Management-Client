import type { NextConfig } from 'next'

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
}

export default nextConfig
