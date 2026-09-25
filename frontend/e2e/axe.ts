import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** WCAG 2.1 A/AA rules from axe-core, plus heading and landmark structure
 * (axe "best practice" rules Lighthouse also checks); any violation fails with a readable list. */
export async function audit(page: Page) {
  const wcag = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const structure = await new AxeBuilder({ page }).withRules(['heading-order', 'page-has-heading-one', 'landmark-one-main']).analyze();
  const violations = [...wcag.violations, ...structure.violations];
  const report = violations.map((v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.slice(0, 8).map((n) => {
    const d = n.any[0]?.data as { fgColor?: string; bgColor?: string; contrastRatio?: number } | undefined;
    return n.target.join(' ') + (d?.fgColor ? ` (${d.fgColor} on ${d.bgColor}: ${d.contrastRatio})` : '');
  }).join('\n  ')}`);
  // Soft: one run lists every page's problems, not just the first page's.
  expect.soft(report, `${page.url()}\n${report.join('\n')}`).toEqual([]);
}
