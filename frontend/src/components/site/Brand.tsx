import { Leaf } from 'lucide-react';
import type { PublicImage } from '@/lib/api/types';

export function Brand({ name, tagline, logo }: { name: string; tagline: string; logo?: PublicImage | null }) {
  return (
    <span className="brand">
      <span className="brand-symbol">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {logo ? <img src={logo.url} alt="" width={logo.width} height={logo.height} /> : <><Leaf size={25} /><span /></>}
      </span>
      <span>{name}<small>{tagline}</small></span>
    </span>
  );
}
