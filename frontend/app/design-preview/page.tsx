import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DesignPreview from '@/legacy/DesignPreview';

/** The original localStorage design preview, kept as a visual reference for
 * screens not yet connected to the API. Disabled unless ENABLE_DESIGN_PREVIEW=1. */
export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default function Page() {
  if (process.env.ENABLE_DESIGN_PREVIEW !== '1') notFound();
  return <DesignPreview />;
}
