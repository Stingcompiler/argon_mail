/**
 * Where to go after login: the `next` query parameter, but only if it is a
 * path inside the dashboard (/admin, /admin/…, /admin?…). Anything else —
 * another site (https://…, //host), another part of the site — goes to /admin,
 * so a crafted login link can't send staff elsewhere after they sign in.
 */
export function safeNext(search: string): string {
  const next = new URLSearchParams(search).get('next') || '';
  return /^\/admin(?:[/?#][^\\]*)?$/.test(next) && !next.startsWith('//') ? next : '/admin';
}
