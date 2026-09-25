import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { UiProvider } from '@/contexts/UiContext';
import './globals.css';

// Self-hosted variable font: no request to Google at runtime. Only the Arabic
// subset is preloaded (headings need it for LCP); the Latin subset (digits,
// codes, emails) loads on first use instead of competing for bandwidth.
const arabic = localFont({
  src: '../node_modules/@fontsource-variable/noto-sans-arabic/files/noto-sans-arabic-arabic-wght-normal.woff2',
  weight: '100 900',
  variable: '--font-arabic',
  display: 'swap',
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

export const viewport: Viewport = { themeColor: '#145A46' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className={`${arabic.variable} ${latin.variable}`}>
      <body><UiProvider>{children}</UiProvider></body>
    </html>
  );
}
