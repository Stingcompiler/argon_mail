import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { UiProvider } from '@/contexts/UiContext';
import './globals.css';

// Self-hosted variable font: no request to Google at runtime. Neither subset is
// preloaded; both load on first use with display: swap.
const arabic = localFont({
  src: '../node_modules/@fontsource-variable/noto-sans-arabic/files/noto-sans-arabic-arabic-wght-normal.woff2',
  weight: '100 900',
  variable: '--font-arabic',
  display: 'swap',
  // Not preloaded: on a slow mobile connection the 166 KB file competed with the
  // page itself for bandwidth before first paint. Text shows at once in the
  // metric-matched fallback and swaps when the font arrives (CLS stays 0).
  preload: false,
  fallback: ['Tahoma', 'Arial', 'sans-serif'],
});
const latin = localFont({
  src: '../node_modules/@fontsource-variable/noto-sans-arabic/files/noto-sans-arabic-latin-wght-normal.woff2',
  weight: '100 900',
  variable: '--font-latin',
  display: 'swap',
  preload: false,
  fallback: ['Tahoma', 'Arial', 'sans-serif'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || 'http://127.0.0.1:3000'),
  title: { default: 'بريد عرجون | خدمات تقرّب المسافات', template: '%s | بريد عرجون' },
  description: 'خدمات متنوعة، وطلب تتابعه بسهولة.',
  openGraph: { locale: 'ar_SD', type: 'website', siteName: 'بريد عرجون' },
  twitter: { card: 'summary_large_image' },
  formatDetection: { telephone: false },
};

// viewport-fit=cover lets the phone tab bar sit above the home indicator (safe-area insets).
export const viewport: Viewport = { themeColor: '#145A46', viewportFit: 'cover' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className={`${arabic.variable} ${latin.variable}`}>
      <body><UiProvider>{children}</UiProvider></body>
    </html>
  );
}
