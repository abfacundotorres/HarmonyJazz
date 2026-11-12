import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { expect, ROUTES, test } from './helpers';

const axeSrc = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

/** Accesibilidad automática (axe-core) en todas las pantallas, con tema claro y oscuro. */
for (const scheme of ['light', 'dark'] as const) {
  test.describe(`accesibilidad (${scheme})`, () => {
    test.use({ colorScheme: scheme });
    for (const r of ROUTES) {
      test(r, async ({ page }) => {
        await page.goto('/' + r);
        await expect(page.locator('nav')).toBeVisible();
        await page.waitForTimeout(600);
        const violations = await page.evaluate(async (src) => {
          (0, eval)(src);
          const res = await (window as unknown as { axe: { run: (d: Document) => Promise<{ violations: { id: string; impact: string; nodes: { target: string[] }[] }[] }> } }).axe.run(document);
          return res.violations.map((v) => `${v.id} [${v.impact}] ×${v.nodes.length}: ${v.nodes[0]?.target.join(' ')}`);
        }, axeSrc);
        expect(violations).toEqual([]);
      });
    }
  });
}
