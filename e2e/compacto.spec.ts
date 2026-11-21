import { expect, test } from './helpers';

// En el celular el contenido tiene que ocupar el ancho y no dejar aire de más: márgenes y relleno chicos, tarjetas casi pegadas.
const RUTAS = ['#/hoy', '#/mes', '#/curricula', '#/progreso', '#/playalong', '#/repertorio', '#/lecciones', '#/escalas', '#/vocabulario', '#/oido', '#/mas'];

test.describe('celular: contenido compacto', () => {
  for (const r of RUTAS) {
    test(`${r}: las tarjetas ocupan el ancho y casi no hay espacio entre ellas`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/' + r);
      await expect(page.locator('main .card').first()).toBeVisible();
      const m = await page.evaluate(() => {
        const cards = [...document.querySelectorAll('main .card')].filter((c) => c.parentElement === document.querySelector('main .card')!.parentElement) as HTMLElement[];
        const rects = cards.map((c) => c.getBoundingClientRect());
        // sólo se mide entre tarjetas que son vecinas una de otra (si hay otra cosa en el medio, el hueco es de ese elemento)
        const gaps = cards.slice(1).flatMap((c, i) => (c.previousElementSibling === cards[i] ? [rects[i + 1].top - rects[i].bottom] : []));
        return {
          n: cards.length,
          izq: Math.min(...rects.map((q) => q.left)),
          ancho: Math.max(...rects.map((q) => q.width)),
          relleno: cards.length ? parseFloat(getComputedStyle(cards[0]).paddingLeft) : 0,
          hueco: gaps.length ? Math.max(...gaps) : 0,
          primera: rects[0]?.top ?? 0,
          desborde: document.documentElement.scrollWidth <= window.innerWidth,
        };
      });
      expect(m.n).toBeGreaterThan(0);
      expect(m.izq, 'margen izquierdo').toBeLessThanOrEqual(8);
      expect(m.ancho, 'ancho de la tarjeta').toBeGreaterThanOrEqual(374);
      expect(m.relleno, 'relleno de la tarjeta').toBeLessThanOrEqual(12);
      expect(m.hueco, 'espacio entre tarjetas').toBeLessThanOrEqual(10);
      expect(m.primera, 'el contenido empieza arriba').toBeLessThanOrEqual(190);
      expect(m.desborde).toBe(true);
    });
  }

  test('en una pantalla grande los márgenes y el relleno siguen siendo los de siempre', async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 800 });
    await page.goto('/#/progreso');
    await expect(page.locator('.page > .card').first()).toBeVisible();
    const p = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.page > .card')!).paddingLeft));
    expect(p).toBe(18);
  });
});
