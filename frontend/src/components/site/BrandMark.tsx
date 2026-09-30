/**
 * The «بريد عرجون» mark: a dove rising from an envelope, wings spread.
 * Drawn after the client's logo as a stand-in until the original artwork is
 * supplied; the owner can upload the real logo in the dashboard (settings),
 * which replaces this everywhere on the site.
 */
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="40 70 240 190" aria-hidden="true" focusable="false">
      <g strokeLinejoin="round">
        <path d="M150 208C110 206 70 178 48 114c34 34 66 48 100 52Z" fill="#15a7d7" stroke="#15a7d7" strokeWidth="6" />
        <path d="M170 208c40-2 80-30 102-94-34 34-66 48-100 52Z" fill="#15a7d7" stroke="#15a7d7" strokeWidth="6" />
        <path d="M150 186c-28-4-52-22-66-50 22 18 44 26 66 28Z" fill="#0771c1" stroke="#0771c1" strokeWidth="6" />
        <path d="M170 186c28-4 52-22 66-50-22 18-44 26-66 28Z" fill="#0771c1" stroke="#0771c1" strokeWidth="6" />
        <path d="M98 94h124l-62 68Z" fill="#05285b" stroke="#05285b" strokeWidth="14" />
        <path d="M122 214c26-10 38-32 42-56 2-14 11-24 23-24 9 0 15 5 18 12l14 5-14 4c-3 27-18 51-45 59Z" fill="#fff" stroke="#fff" strokeWidth="3" />
        <circle cx="191" cy="143" r="4.5" fill="#05285b" />
      </g>
      <path d="M94 234c44 14 88 14 132 0" fill="none" stroke="#0771c1" strokeWidth="12" strokeLinecap="round" />
    </svg>
  );
}
