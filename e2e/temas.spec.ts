import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { expect, test } from './helpers';

const axeSrc = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const THEMES = ['vintage', 'club', 'partitura', 'bn-azul', 'bn-naranja', 'bn-rojo'];
const ROUTES = ['#/hoy', '#/mas', '#/playalong', '#/lecciones/guide-tones', '#/escalas'];

test('el tema se elige en Más, se aplica al instante y se recuerda al recargar', async ({ page }) => {
  await page.goto('/#/mas');
  const html = page.locator('html');
  await expect(html).not.toHaveAttribute('data-theme', /.+/);
  await page.getByRole('radio', { name: 'Blue Note · azul' }).click();
  await expect(html).toHaveAttribute('data-theme', 'bn-azul');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0a2342');
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(10, 35, 66)');
  // la tipografía de los títulos se carga de verdad (no cae a otra)
  await page.evaluate(() => document.fonts.load('700 20px "Barlow Condensed"'));
  expect(await page.evaluate(() => document.fonts.check('700 20px "Barlow Condensed"'))).toBe(true);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('h2')!).textTransform)).toBe('uppercase');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:settings')!).theme)).toBe('bn-azul');

  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'bn-azul');
  await expect(page.getByRole('radio', { name: 'Blue Note · azul' })).toHaveAttribute('aria-checked', 'true');

  await page.getByRole('radio', { name: 'Papel de partitura' }).click();
  await page.evaluate(() => document.fonts.load('400 20px "Libre Baskerville"'));
  expect(await page.evaluate(() => document.fonts.check('400 20px "Libre Baskerville"'))).toBe(true);
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(245, 245, 242)');

  await page.getByRole('radio', { name: 'Automático' }).click();
  await expect(html).not.toHaveAttribute('data-theme', /.+/);
});

test('el automático sigue al celular: claro de día, oscuro de noche', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/#/hoy');
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(23, 18, 13)');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(236, 223, 192)');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#ecdfc0');
});

test('un tema elegido manda aunque el celular esté en el otro modo', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(() => localStorage.setItem('harmonyjazz:settings', JSON.stringify({ theme: 'vintage' })));
  await page.goto('/#/hoy');
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(236, 223, 192)');
});

for (const theme of THEMES.filter((t) => !['vintage', 'club'].includes(t))) {
  test.describe(`accesibilidad (${theme})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('harmonyjazz:settings', JSON.stringify({ theme: t })), theme);
    });
    for (const r of ROUTES) {
      test(r, async ({ page }) => {
        await page.goto('/' + r);
        await expect(page.getByRole('navigation', { name: 'Secciones' })).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        await page.waitForTimeout(600);
        const violations = await page.evaluate(async (src) => {
          (0, eval)(src);
          const res = await (window as unknown as { axe: { run: (d: Document) => Promise<{ violations: { id: string; impact: string; nodes: { target: string[] }[] }[] }> } }).axe.run(document);
          return res.violations.map((v) => `${v.id} [${v.impact}] ×${v.nodes.length}: ${v.nodes[0]?.target.join(' ')}`);
        }, axeSrc);
        expect(violations).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      });
    }
  });
}
