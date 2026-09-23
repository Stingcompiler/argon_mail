import { ArrowLeft, ArrowUpLeft } from 'lucide-react';
import Link from 'next/link';
import type { PublicService } from '@/lib/api/types';
import { iconFor } from '../icons';

export function ServiceCard({ service: s, cta = 'اكتشف الخدمة' }: { service: PublicService; cta?: string }) {
  const Icon = iconFor(s.icon_key);
  const href = `/services/${encodeURIComponent(s.slug)}`;
  return (
    <article className="service-card">
      <Link className={`service-art ${s.color}`} href={href} tabIndex={-1} aria-hidden="true">
        <div className="art-ring" />
        <Icon size={46} strokeWidth={1.25} />
        <span>{s.tagline}</span>
        <ArrowUpLeft className="art-arrow" size={18} />
      </Link>
      <div className="service-body">
        <small>{s.category.name}</small>
        <h3><Link href={href}>{s.name}</Link></h3>
        <p>{s.description}</p>
        <Link className="text-button" href={href}>{cta} <ArrowLeft size={17} /></Link>
      </div>
    </article>
  );
}
