import type { Page } from '@playwright/test';

/**
 * Every Western digit the page shows must sit inside `.num` or `[data-num]`
 * (docs/design/DESIGN.md, «قاعدة الأرقام»), and numeric table columns align to
 * the end. Returns the offenders as readable strings.
 */
export async function numberProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent || '';
      if (!/[0-9]/.test(text)) continue;
      const el = n.parentElement!;
      if (el.closest('script,style,noscript,svg,template,[hidden]')) continue;
      if (!el.getClientRects().length && !el.closest('.sr-only')) continue; // not rendered
      if (el.closest('.num,[data-num],[data-free]')) continue; // data-free: text people typed (names, messages)
      out.push(`«${text.trim().slice(0, 40)}» in <${el.tagName.toLowerCase()} class="${el.className}">`);
    }
    for (const cell of document.querySelectorAll<HTMLElement>('td[data-num],th[data-num]')) {
      const a = getComputedStyle(cell).textAlign;
      if (a !== 'end' && a !== 'left') out.push(`numeric column aligned ${a}: «${cell.textContent?.trim().slice(0, 20)}»`);
    }
    return [...new Set(out)];
  });
}
