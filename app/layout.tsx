import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'بريد عرجون | خدمات تقرّب المسافات', description: 'خدمات متنوعة، وطلب تتابعه بسهولة.', robots: {index: false, follow: false} };
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {return <html lang="ar" dir="rtl"><body>{children}</body></html>}
