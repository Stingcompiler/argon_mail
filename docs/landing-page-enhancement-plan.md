# Landing page enhancement plan

Status: proposed. This document is a plan, not a record of completed changes.

## Goal

Help a first-time visitor understand what Arjoon does, find a suitable service, submit a request, and trust the follow-up process. Existing customers must still be able to track a request quickly. The platform offers diverse, owner-managed services; postal, education, travel, and document services are examples, not fixed categories.

## Current baseline

The page already has a coherent Arabic RTL design, a responsive layout, featured services, a three-step explanation, request tracking, FAQ, keyboard focus styles, and mobile navigation. The main gaps are a broad value proposition, a postal-heavy default illustration, limited proof behind trust claims, no strong closing action, and limited cues for the mobile service carousel. The direct WhatsApp button is hidden until the owner configures a platform number.

## Phase 1 — Message and conversion path (highest priority)

1. Rewrite the editable hero title and body to answer, in the first screen: what services Arjoon helps with, how to request one, and how the customer follows its progress. Keep the copy short enough for a phone. Example for editorial review, not mandatory final text: **«خدمات متنوعة، بطلب واحد واضح»** / «اختر الخدمة المناسبة، أرسل تفاصيلك، واحتفظ برقم طلبك لمتابعة حالته. يتواصل معك فريق عرجون عبر واتساب عند الحاجة.» Do not promise response times or outcomes that operations cannot support.
2. Make **«استعرض الخدمات»** or **«ابدأ طلبك»** the primary action for new visitors. Keep **«تابع طلبك»** visible as a distinct action for existing customers. Test the header, hero, and mobile tab bar so the two journeys are easy to distinguish. A generic homepage cannot jump to a request form without selecting a service, so the primary action should lead to `/services` unless a real guided selector is built.
3. Review section priority: hero → featured services → how it works → concise trust/process details → FAQ → closing action. Keep tracking accessible near the top or in navigation, but reduce its visual competition with the first-time visitor journey. Confirm the final mobile order in a real viewport before changing the owner-controlled section ordering model.

**Acceptance:** A new visitor can identify the offer, next action, and tracking method from the first screen without guessing; each primary action has one clear destination.

## Phase 2 — Visual fit for a diverse-services platform

1. Replace the default envelope-centric hero artwork with a visual of several service types or the request journey. Preserve the current green, ivory, and gold palette and `lucide-react` icon language. Use an optimized, responsive asset with meaningful alternative text if it conveys information; mark purely decorative parts as hidden from assistive technology.
2. Keep service imagery flexible: no hard-coded category set or claims in the illustration. The owner can already replace the hero image and control featured services; the fallback visual should remain accurate if categories change.
3. Tighten mobile hero height and spacing so the first service choice appears sooner, while keeping the primary action and text readable. Do not add continuous decorative animation or move the largest hero element; the project already found those changes harmed loading performance.

**Acceptance:** The hero does not imply that all services are postal; desktop and phone layouts retain a clear hierarchy; the image does not delay the page's largest visible element unnecessarily.

## Phase 3 — Explain the process and earn trust

1. Expand the three steps with concrete facts: choose a service, submit details and a WhatsApp number, receive a request code, then check status with that code. Explain that email is used for internal alerts and that staff continue work in the dashboard; do not imply the customer receives an email thread if that is not the product flow.
2. Replace broad reassurance labels with verifiable statements, linked to the relevant details where useful: who sees request data, when pricing is confirmed, how the customer is contacted, and what the status page shows. Add response-time or completion claims only after the owner defines and can meet them.
3. Add a small trust section only with real evidence: an accurate team/business description, service coverage, or verified customer feedback. Do not fabricate ratings, testimonials, counts, partner logos, or guarantees. If no evidence is available yet, use a transparent “what happens after submission” panel instead.
4. Review FAQ wording against the actual order, quote, WhatsApp, and tracking flows. Include a direct answer to whether the customer needs an account and whether pricing is known before review.

**Acceptance:** Every public claim matches current behavior and has an accountable source in the product or owner-provided content.

## Phase 4 — Mobile discovery and closing action

1. Keep the featured-service carousel if it performs well, but add a visible swipe cue or progress indicator and retain **«جميع الخدمات»**. Ensure keyboard users can reach every card and that cards remain readable at narrow widths. Consider a simple vertical list if testing shows visitors miss later cards.
2. Add a closing section after FAQ with a primary route to services and a secondary contact route. Show a WhatsApp-specific action only when `whatsapp_url` is configured; otherwise route to `/contact`. Configure and verify the platform WhatsApp number before launch if direct chat is a core promise.
3. Check that the fixed mobile tab bar and WhatsApp button do not cover content or calls to action, including safe-area insets and open keyboard states.

**Acceptance:** All featured services can be discovered on a phone, and a visitor reaching the bottom has a clear next step.

## Phase 5 — Validation and release

- Review the final Arabic copy with the owner; verify it still describes new service types added later through the dashboard.
- Test at approximately 320, 390, 768, 1440, and 1920 CSS pixels, including RTL alignment, zoom to 200%, keyboard navigation, visible focus, and reduced motion.
- Run the existing public accessibility and navigation tests. Check WCAG 2.2 AA contrast for small text and controls, and accessible names for links, forms, and carousel controls.
- Measure mobile LCP, INP, and CLS on a production build. The existing project report records an LCP above its 2.5-second goal; compare before and after the hero change rather than assuming a new illustration is free.
- Test the journeys: homepage → service → request submission; homepage → tracking with a valid/invalid code; homepage → contact and configured WhatsApp. Verify there is no dead CTA when featured services or FAQ are empty.
- Track useful events without exposing personal data: primary CTA clicks, service selections, request starts/completions, tracking starts, and contact clicks. Compare completion rates after release before making further design changes.

## Implementation boundaries

Keep the current monolithic Django/DRF + Next.js deployment. Homepage content and featured services remain owner-controlled in the dashboard; do not hard-code service categories. Use existing Context API and TanStack Query conventions where client state or data loading is needed. Public landing interactions do not require JWT; admin editing continues to use the existing JWT flow. Reuse `lucide-react` icons and the established design tokens. Add backend fields only if the owner needs to edit new homepage copy or section visibility from the dashboard; otherwise prefer the current settings and component structure.

Likely touchpoints: `frontend/app/(site)/page.tsx`, `frontend/app/globals.css`, `frontend/src/components/site/SiteHeader.tsx`, `frontend/src/components/site/ServiceCard.tsx`, and the existing content settings/admin editor if new editable fields are introduced.
