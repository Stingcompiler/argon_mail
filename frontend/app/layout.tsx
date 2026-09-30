import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { UiProvider } from '@/contexts/UiContext';
import './globals.css';

// Self-hosted variable font: no request to Google at runtime. Both files are
// cut to the weights the site uses (400–700), and the Arabic one to the basic
// Arabic and Arabic Supplement blocks (scripts/subset-arabic-font.sh): 166 KB →
// 40 KB for the file the hero heading waits for. Only the Arabic file is
// preloaded; the Latin one (digits, codes, emails) loads on first use.
const arabic = localFont({
  src: '../src/fonts/noto-sans-arabic-subset.woff2',
  weight: '400 700',
  variable: '--font-arabic',
  display: 'swap',
  fallback: ['Tahoma', 'Arial', 'sans-serif'],
  // Keep in sync with UNICODES in scripts/subset-arabic-font.sh.
  declarations: [{ prop: 'unicode-range', value: 'U+0600-06FF, U+0750-077F, U+200C-200F, U+2010-2011, U+204F, U+25CC, U+FD3E-FD3F' }],
});
const latin = localFont({
  src: '../src/fonts/noto-sans-arabic-latin.woff2',
  weight: '400 700',
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
