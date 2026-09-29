/**
 * First-party product events, with no network calls and no personal data.
 *
 * Each event is dispatched as a DOM CustomEvent («arjoon:event») and, only when
 * a tag manager has already created `window.dataLayer`, pushed there too. Until
 * the owner chooses an analytics tool nothing leaves the browser. Properties
 * are limited to page paths, service slugs and fixed labels: never names,
 * phone numbers, order codes or form contents.
 */
export type AnalyticsEvent =
  | { name: 'cta_click'; target: 'services' | 'track'; area: string }
  | { name: 'service_select'; service: string; area: string }
  | { name: 'contact_click'; channel: 'whatsapp' | 'email' | 'phone' | 'contact_page'; area: string }
  | { name: 'tracking_start'; method: 'code' | 'name_phone' }
  | { name: 'request_start'; service: string }
  | { name: 'request_complete'; service: string };

declare global {
  interface Window { dataLayer?: Record<string, unknown>[] }
}

export function track(event: AnalyticsEvent) {
  if (typeof window === 'undefined') return;
  const { name, ...props } = event;
  window.dispatchEvent(new CustomEvent('arjoon:event', { detail: event }));
  if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event: name, ...props });
}

/** Where on the page a click happened: a marked area, else the landmark. */
function areaOf(el: Element) {
  const marked = el.closest<HTMLElement>('[data-area]');
  if (marked) return marked.dataset.area!;
  if (el.closest('.tab-bar')) return 'tab_bar';
  if (el.closest('.nav-sheet')) return 'menu';
  if (el.closest('header')) return 'header';
  if (el.closest('footer')) return 'footer';
  if (el.closest('.whatsapp')) return 'floating';
  return 'page';
}

/** Classifies a link click into an event, from its destination alone. */
export function eventForLink(a: HTMLAnchorElement): AnalyticsEvent | null {
  const area = areaOf(a);
  const href = a.getAttribute('href') || '';
  if (/^https:\/\/(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)\//.test(href)) return { name: 'contact_click', channel: 'whatsapp', area };
  if (href.startsWith('mailto:')) return { name: 'contact_click', channel: 'email', area };
  if (href.startsWith('tel:')) return { name: 'contact_click', channel: 'phone', area };
  if (a.origin !== window.location.origin) return null;
  const path = decodeURIComponent(a.pathname);
  if (path === '/contact') return { name: 'contact_click', channel: 'contact_page', area };
  if (path === '/services') return { name: 'cta_click', target: 'services', area };
  if (path === '/track') return { name: 'cta_click', target: 'track', area };
  const service = path.match(/^\/services\/([^/]+)$/);
  if (service) return { name: 'service_select', service: service[1], area };
  return null;
}
