import { expect, test } from './helpers';

// Celular apaisado: poca altura. El encabezado no puede comerse la pantalla ni quedar fijo, y nada se desborda.
const TAMANOS = [
  { width: 844, height: 390 },
  { width: 740, height: 360 },
];
const RUTAS = ['#/hoy', '#/mes', '#/progreso', '#/playalong', '#/lecciones', '#/escalas', '#/vocabulario', '#/transcribir', '#/oido', '#/mas'];

test.describe('celular apaisado', () => {
  for (const t of TAMANOS) {
    for (const r of RUTAS) {
      test(`${t.width}×${t.height} ${r}: encabezado en una fila, no fijo, sin desborde`, async ({ page }) => {
        await page.setViewportSize(t);
        await page.goto('/' + r);
        await expect(page.locator('main .card').first()).toBeVisible();
        const m = await page.evaluate(() => {
          const top = document.querySelector('header.top') as HTMLElement;
          const q = top.getBoundingClientRect();
          const nav = top.querySelector('nav')!.getBoundingClientRect();
          const brand = top.querySelector('.brand')!.getBoundingClientRect();
          const card = document.querySelector('main .card')!.getBoundingClientRect();
          return {
            alto: q.height,
            fijo: getComputedStyle(top).position,
            nombre: getComputedStyle(top.querySelector('.brandname')!).display,
            // marca y menú en el mismo renglón, el menú a la derecha
            fila: Math.abs(nav.top - brand.top) < 12,
            orden: brand.left < nav.left,
            primera: card.top,
            desborde: document.documentElement.scrollWidth <= window.innerWidth,
          };
        });
        expect(m.alto, 'alto del encabezado').toBeLessThanOrEqual(70);
        expect(['static', 'relative'], 'no fijo (relative ancla el panel del menú)').toContain(m.fijo);
        expect(m.nombre).toBe('none');
        expect(m.fila, 'una sola fila').toBe(true);
        expect(m.orden, 'marca, menú').toBe(true);
        expect(m.primera, 'el contenido empieza arriba').toBeLessThanOrEqual(150);
        expect(m.desborde).toBe(true);
      });
    }
  }

  test('en vertical el encabezado es una sola fila, con el nombre y el menú', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#/hoy');
    await expect(page.locator('main .card').first()).toBeVisible();
    const m = await page.evaluate(() => {
      const top = document.querySelector('header.top')!;
      return { nombre: getComputedStyle(top.querySelector('.brandname')!).display, alto: top.getBoundingClientRect().height };
    });
    expect(m.nombre).not.toBe('none');
    expect(m.alto).toBeLessThanOrEqual(70);
  });

  test('en una pantalla grande el encabezado sigue fijo arriba', async ({ page }) => {
    await page.setViewportSize({ width: 1180, height: 800 });
    await page.goto('/#/hoy');
    await expect(page.locator('main .card').first()).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('header.top')!).position)).toBe('sticky');
  });
});
