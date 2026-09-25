import { ImageResponse } from 'next/og';
import { BRAND, RtlLine, brandMarkDataUri, cairo } from '@/lib/og/render';

// Default share image for every page (WhatsApp, Facebook, X). Rendered once
// at build time; text is static because Django is not running during builds.
export const alt = 'بريد عرجون — خدمات متنوعة ومسافات أقرب';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const dynamic = 'force-static';

export default async function OpengraphImage() {
  const [bold, regular, mark] = await Promise.all([cairo(700), cairo(400), brandMarkDataUri()]);
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: BRAND.cream, fontFamily: 'Cairo' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end', gap: 18, flex: 1, padding: '0 80px', background: BRAND.green }}>
          <RtlLine text="بريد عرجون" size={104} color="#FFFFFF" />
          <RtlLine text="خدمات متنوعة ومسافات أقرب" size={44} color={BRAND.sage} weight={400} />
          <div style={{ display: 'flex', width: 140, height: 8, borderRadius: 8, background: BRAND.gold, marginTop: 12 }} />
          <RtlLine text="اطلب خدمتك وتابع طلبك بسهولة" size={34} color="#FFFFFF" weight={400} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 400 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mark} width={280} height={280} alt="" />
        </div>
      </div>
    ),
    { ...size, fonts: [bold, regular] },
  );
}
