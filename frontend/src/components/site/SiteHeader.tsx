'use client';
import { ArrowUpLeft, Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { NavItem, PublicImage } from '@/lib/api/types';
import { Brand } from './Brand';
import { NavSheet, useIsActive } from './MobileNav';

/** Desktop: inline links. Below 1024px: a slim sticky bar whose menu button
 * opens the navigation as a bottom sheet (phones also get the tab bar). */
export function SiteHeader({ name, tagline, logo, nav, whatsapp }: { name: string; tagline: string; logo?: PublicImage | null; nav: NavItem[]; whatsapp?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const active = useIsActive();
  const links = nav.filter((n) => n.enabled);
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="logo-button" href="/" aria-label={`${name} — الرئيسية`}><Brand name={name} tagline={tagline} logo={logo} /></Link>
        <nav aria-label="التنقل الرئيسي">
          {links.map((n) => (
            <Link key={n.href} href={n.href} className={active(n.href) ? 'active' : ''} aria-current={active(n.href) ? 'page' : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>
        <Link className="button secondary header-track" href="/track">تابع طلبك <ArrowUpLeft size={17} /></Link>
        <button type="button" className="mobile-menu icon-button" aria-label="القائمة" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
          <Menu size={22} />
        </button>
      </div>
      <NavSheet open={open} onClose={() => setOpen(false)} nav={links} whatsapp={whatsapp} />
    </header>
  );
}
