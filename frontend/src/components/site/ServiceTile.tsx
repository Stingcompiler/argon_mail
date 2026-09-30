import Link from 'next/link';
import type { PublicService } from '@/lib/api/types';
import { iconFor } from '../icons';

export const serviceHref = (slug: string) => `/services/${encodeURIComponent(slug)}`;

/** A service inside its area: the icon above the name, like an app tile. */
export function ServiceTile({ service: s }: { service: PublicService }) {
  const Icon = iconFor(s.icon_key);
  return (
    <Link className="service-tile" href={serviceHref(s.slug)} data-service={s.slug}>
      <span className="tile-icon" aria-hidden="true"><Icon size={26} strokeWidth={1.5} /></span>
      <span className="tile-name">{s.name}</span>
    </Link>
  );
}
