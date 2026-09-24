'use client';
import { ArrowUpLeft, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Brand } from './Brand';

const NAV = [
  { href: '/', label: 'الرئيسية' },
  { href: '/services', label: 'خدماتنا' },
  { href: '/about', label: 'عن المنصة' },
  { href: '/contact', label: 'تواصل معنا' },
];

export function SiteHeader({ name, tagline }: { name: string; tagline: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const active = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="logo-button" href="/" aria-label={`${name} — الرئيسية`}><Brand name={name} tagline={tagline} /></Link>
        <nav className={open ? 'open' : ''} aria-label="التنقل الرئيسي">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={active(n.href) ? 'active' : ''} aria-current={active(n.href) ? 'page' : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>
        <Link className="button header-track" href="/track">تابع طلبك <ArrowUpLeft size={17} /></Link>
        <button className="mobile-menu icon-button" aria-label="القائمة" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
