import { ImageResponse } from 'next/og';
import { brandMarkDataUri } from '@/lib/og/render';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';
export const dynamic = 'force-static';

export default async function AppleIcon() {
  const mark = await brandMarkDataUri();
  return new ImageResponse(
    // eslint-disable-next-line @next/next/no-img-element
    (<div style={{ width: '100%', height: '100%', display: 'flex' }}><img src={mark} width={180} height={180} alt="" /></div>),
    size,
  );
}
