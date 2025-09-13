
import type {NextConfig} from 'next';

// Configuration for Next.js
const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'urmarketprints.com', 
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdnp.sanmar.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  async redirects() {
    return [
      {
        source: '/favicon.ico',
        destination: '/',
        permanent: true,
      },
      {
        source: '/page',
        destination: '/',
        permanent: true,
      },
      {
        source: '/customizer-v2',
        destination: '/customizer',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/auth/callback',
        destination: '/api/shopify/callback',
      },
    ];
  },
};

export default nextConfig;

    