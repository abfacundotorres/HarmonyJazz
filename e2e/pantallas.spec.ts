import { expect, ROUTES, test, unlock } from './helpers';

test.describe('pantallas', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  for (const r of ROUTES) {
    test(`${r}: carga, tiene un título principal y no se desborda`, async ({ page }) => {
      await page.goto('/' + r);
      await expect(page.locator('nav')).toBeVisible();
      await expect(page.locator('h1')).toHaveCount(1);
      await page.waitForTimeout(500);
      const { sw, vw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, vw: window.innerWidth }));
      expect(sw, 'ancho de la página').toBeLessThanOrEqual(vw);
    });
  }

  test('los controles táctiles miden al menos 44 px', async ({ browser }) => {
    // la regla vale para punteros "gruesos": se emula un celular
    const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: true });
    const p = await ctx.newPage();
    await unlock(p);
    await p.goto('/#/playalong');
    await p.waitForSelector('.player');
    const small = await p.evaluate(() =>
      [...document.querySelectorAll('button, select, summary')]
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.width > 0 && r.height > 0 && r.height < 43.5)
        .map(({ el }) => (el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 30)),
    );
    expect(small, 'controles de menos de 44 px').toEqual([]);
    await ctx.close();
  });
});
