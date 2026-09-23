import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

/**
 * Next.js is the only public entry point. It proxies /api, /media and
 * /django-admin to Django on its internal address (Gunicorn on 127.0.0.1),
 * so the browser sees a single origin and no CORS is needed.
 */
const django = (process.env.DJANGO_INTERNAL_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

const security = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  ...(process.env.NODE_ENV === 'production' ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }] : []),
];
const noindex = [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }];

export default function config(phase: string): NextConfig {
  return {
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
    output: 'standalone',
    devIndicators: false,
    poweredByHeader: false,
    trailingSlash: false,
    // Django URLs end with a slash; keep them as-is when proxying.
    skipTrailingSlashRedirect: true,
    async rewrites() {
      // The proxy drops trailing slashes; Django restores them internally
      // (apps/core/middleware.py) so no redirect loop occurs.
      return [
        { source: '/api/:path*', destination: `${django}/api/:path*` },
        { source: '/media/:path*', destination: `${django}/media/:path*` },
        { source: '/django-admin/:path*', destination: `${django}/django-admin/:path*` },
        { source: '/django-static/:path*', destination: `${django}/django-static/:path*` },
      ];
    },
    async headers() {
      return [
        { source: '/:path*', headers: security },
        { source: '/admin/:path*', headers: noindex },
        { source: '/admin', headers: noindex },
        { source: '/track', headers: noindex },
        { source: '/order-success', headers: noindex },
        { source: '/api/:path*', headers: noindex },
      ];
    },
  };
}
