import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { Providers } from '@/contexts/Providers';
import './globals.css';

// Self-hosted variable font: no request to Google at runtime.
const arabic = localFont({
  src: [
    { path: '../node_modules/@fontsource-variable/noto-sans-arabic/files/noto-sans-arabic-arabic-wght-normal.woff2', weight: '100 900' },
    { path: '../node_modules/@fontsource-variable/noto-sans-arabic/files/noto-sans-arabic-latin-wght-normal.woff2', weight: '100 900' },
  ],
  variable: '--font-arabic',
  display: 'swap',
  fallback: ['Tahoma', 'Arial', 'sans-serif'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || 'http://127.0.0.1:3000'),
  title: { default: 'بريد عرجون | خدمات تقرّب المسافات', template: '%s | بريد عرجون' },
  description: 'خدمات متنوعة، وطلب تتابعه بسهولة.',
  openGraph: { locale: 'ar_SD', type: 'website', siteName: 'بريد عرجون' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: '#145A46' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className={arabic.variable}>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
