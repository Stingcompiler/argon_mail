'use client';
import { ArrowUpLeft, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { NavItem, PublicImage } from '@/lib/api/types';
import { Brand } from './Brand';


export function SiteHeader({ name, tagline, logo, nav }: { name: string; tagline: string; logo?: PublicImage | null; nav: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const active = (href: string) => { const h = decodeURIComponent(href); return h === '/' ? pathname === '/' : decodeURIComponent(pathname).startsWith(h); };
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="logo-button" href="/" aria-label={`${name} — الرئيسية`}><Brand name={name} tagline={tagline} logo={logo} /></Link>
        <nav className={open ? 'open' : ''} aria-label="التنقل الرئيسي">
          {nav.filter((n) => n.enabled).map((n) => (
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
