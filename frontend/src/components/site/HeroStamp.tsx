/**
 * Phones only: a small postal mark (an envelope with its stamp) behind the
 * hero copy, where the journey artwork is hidden (docs/landing-mobile-audit-plan.md,
 * batch 1). Decorative and inline, so it costs no request; the copy itself
 * says «بريد».
 */
export function HeroStamp() {
  return (
    <svg className="hero-stamp" viewBox="0 0 120 92" aria-hidden="true" focusable="false">
      <rect x="2" y="14" width="116" height="76" rx="10" fill="var(--white)" stroke="currentColor" strokeWidth="3" />
      <path d="M6 22 60 58 114 22" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <rect x="82" y="22" width="26" height="26" rx="3" fill="var(--accent-100)" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2" />
      <circle cx="95" cy="35" r="6" fill="currentColor" opacity=".75" />
      <path d="M14 78h36" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity=".45" />
    </svg>
  );
}
