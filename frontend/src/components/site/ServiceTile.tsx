import Link from 'next/link';
import type { PublicService } from '@/lib/api/types';
import { iconFor } from '../icons';

export const serviceHref = (slug: string) => `/services/${encodeURIComponent(slug)}`;
const TINTS = new Set(['sage', 'sand', 'blue', 'rose']);

/**
 * A service type inside its area (docs/ui-profile.md, «الأسطح المصبوغة»): the
 * whole tile carries the area's tint, the icon sits on it directly, and the
 * name is shown in full. The tile is one link that opens the request form.
 */
export function ServiceTile({ service: s, tint }: { service: PublicService; tint?: string }) {
  const Icon = iconFor(s.icon_key);
  return (
    <Link className={`service-tile tint-${tint && TINTS.has(tint) ? tint : 'sage'}`} href={serviceHref(s.slug)} data-service={s.slug}>
      <Icon className="tile-glyph" size={30} strokeWidth={1.5} aria-hidden="true" />
      <span className="tile-name">{s.name}</span>
    </Link>
  );
}
