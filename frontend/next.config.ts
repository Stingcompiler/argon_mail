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

// Baseline CSP. Next injects inline bootstrap scripts, so script-src needs
// 'unsafe-inline' until nonces are added (they need middleware, which V1
// avoids). Everything else is locked to this origin.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');
if (process.env.NODE_ENV === 'production') security.push({ key: 'Content-Security-Policy', value: csp });

// Upper bound for proxied request bodies. Keep above UPLOAD_MAX_REQUEST_MB
// (Django, default 20) plus room for form fields; Next truncates at 10 MB
// otherwise and the upload fails with a 500.
const PROXY_BODY_LIMIT = (process.env.PROXY_BODY_LIMIT || '22mb') as `${number}mb`;

export default function config(phase: string): NextConfig {
  return {
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
    output: 'standalone',
    devIndicators: false,
    experimental: { middlewareClientMaxBodySize: PROXY_BODY_LIMIT },
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
