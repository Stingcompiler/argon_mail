import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { UiProvider } from '@/contexts/UiContext';
import './globals.css';

// IBM Plex Sans Arabic + IBM Plex Sans, weights 400/500/600/700, one family for
// Arabic, Latin and numbers (docs/design/DESIGN.md, decision D-0007 option A).
// Self-hosted static files cut to the characters the site writes
// (scripts/subset-fonts.sh): about 18 KB per Arabic weight and 21 KB per Latin
// weight. The CSS exposes them only through --font-ui / --font-mono /
// --font-display in app/globals.css; these two variables are internal.
const IBMPlexSansArabic = localFont({
  src: [
    { path: '../src/fonts/plex-arabic-400.woff2', weight: '400', style: 'normal' },
    { path: '../src/fonts/plex-arabic-500.woff2', weight: '500', style: 'normal' },
    { path: '../src/fonts/plex-arabic-600.woff2', weight: '600', style: 'normal' },
    { path: '../src/fonts/plex-arabic-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--plex-arabic',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
  // Keep in sync with ARABIC in scripts/subset-fonts.sh.
  declarations: [{ prop: 'unicode-range', value: 'U+060C, U+061B, U+061F, U+0621-0655, U+0660-066D, U+0670-0671, U+067E, U+0686, U+0698, U+06A4, U+06A9, U+06AF, U+06CC, U+200C-200F, U+2010-2011, U+204F, U+25CC, U+FD3E-FD3F' }],
});
const IBMPlexSans = localFont({
  src: [
    { path: '../src/fonts/plex-latin-400.woff2', weight: '400', style: 'normal' },
    { path: '../src/fonts/plex-latin-500.woff2', weight: '500', style: 'normal' },
    { path: '../src/fonts/plex-latin-600.woff2', weight: '600', style: 'normal' },
    { path: '../src/fonts/plex-latin-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--plex-latin',
  display: 'swap',
  preload: false,
  fallback: ['system-ui', 'sans-serif'],
  // Keep in sync with LATIN in scripts/subset-fonts.sh.
  declarations: [{ prop: 'unicode-range', value: 'U+0020-007E, U+00A0-00FF, U+2013-2014, U+2018-201E, U+2022, U+2026, U+2032-2033, U+20AC, U+2122' }],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || 'http://127.0.0.1:3000'),
  title: { default: 'بريد عرجون | للخدمات الإلكترونية والرقمية', template: '%s | بريد عرجون' },
  description: 'خدمات إلكترونية ورقمية متنوعة بطلب واحد واضح، ومتابعة برقم الطلب.',
  openGraph: { locale: 'ar_SD', type: 'website', siteName: 'بريد عرجون' },
  twitter: { card: 'summary_large_image' },
  formatDetection: { telephone: false },
};

// viewport-fit=cover lets the phone tab bar sit above the home indicator (safe-area insets).
export const viewport: Viewport = { themeColor: '#05285B', viewportFit: 'cover' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className={`${IBMPlexSansArabic.variable} ${IBMPlexSans.variable}`}>
      <body><UiProvider>{children}</UiProvider></body>
    </html>
  );
}
