import { expect, test } from './helpers';

/** Lo medible de cada acorde del tablero del atril: su caja (posición y tamaño). */
const CAJAS = `(() => [...document.querySelectorAll('.atril .board .bar')].map((b) => [...b.querySelectorAll(':scope > span')].map((c) => { const r = c.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(Math.round); })))()`;

test.describe('atril: el acorde que suena', () => {
  for (const [tema, tamano] of [['ii-v-i', 2], ['ii-v-i-short', 2], ['ii-v-i-12', 2], ['ii-v-i-12', 5], ['rhythm', 3]] as const) {
    test(`${tema} con letra ${tamano}: marcar un acorde como el que suena no mueve nada ni lo subraya`, async ({ page }) => {
      await page.addInitScript((n) => localStorage.setItem('harmonyjazz:atril', JSON.stringify({ size: n })), tamano);
      await page.goto(`/#/playalong?p=${tema}`);
      await page.getByRole('button', { name: /Modo atril/ }).click();
      await expect(page.locator('.atril .board .bar').first()).toBeVisible();
      const r = await page.evaluate((cajasSrc) => {
        const cajas = () => JSON.stringify((0, eval)(cajasSrc));
        const base = cajas();
        const malos: string[] = [];
        const bars = [...document.querySelectorAll('.atril .board .bar')] as HTMLElement[];
        bars.forEach((b, bi) => {
          [...b.querySelectorAll(':scope > span')].forEach((c, ci) => {
            b.classList.add('now');
            c.classList.add('cur');
            const deco = getComputedStyle(c).textDecorationLine;
            if (cajas() !== base) malos.push(`compás ${bi + 1}, acorde ${ci + 1}: se movió algo`);
            if (deco !== 'none') malos.push(`compás ${bi + 1}, acorde ${ci + 1}: subrayado (${deco})`);
            const bg = getComputedStyle(c).backgroundColor;
            if (bg === 'rgba(0, 0, 0, 0)') malos.push(`compás ${bi + 1}, acorde ${ci + 1}: sin marca visible`);
            c.classList.remove('cur');
            b.classList.remove('now');
          });
        });
        return { malos, compases: bars.length };
      }, CAJAS);
      expect(r.compases).toBeGreaterThan(3);
      expect(r.malos).toEqual([]);
    });
  }

  for (const [tema, tono, tamano, ancho] of [
    ['ii-v-i-short', null, 2, 390],
    ['aaba-subdominante', 'D', 2, 360],
    ['aaba-subdominante', 'D', 3, 412],
    ['aaba-subdominante', 'F', 5, 412],
    ['blues-f', 'Db', 2, 360],
    ['rhythm', 'B', 4, 390],
    ['menor-aaba', 'Gb', 3, 360],
  ] as const) {
    test(`${tema}${tono ? ' en ' + tono : ''}, letra ${tamano}, ${ancho} px: los dos acordes de un compás siguen en un solo renglón, marcado o no`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 800 });
      await page.addInitScript((n) => localStorage.setItem('harmonyjazz:atril', JSON.stringify({ size: n })), tamano);
      await page.goto(`/#/playalong?p=${tema}${tono ? `&k=${tono}` : ''}`);
      await page.getByRole('button', { name: /Modo atril/ }).click();
      await expect(page.locator('.atril .board .bar').first()).toBeVisible();
      await page.waitForTimeout(300);
      const r = await page.evaluate(() => {
        const bars = [...document.querySelectorAll('.atril .board .bar.two')] as HTMLElement[];
        const malos: string[] = [];
        bars.forEach((b, bi) => {
          for (const marcado of [false, true]) {
            b.classList.toggle('now', marcado);
            const spans = [...b.querySelectorAll(':scope > span')] as HTMLElement[];
            spans.forEach((x, i) => x.classList.toggle('cur', marcado && i === 0));
            const rects = spans.map((x) => x.getBoundingClientRect());
            const ys = new Set(rects.map((q) => Math.round(q.y)));
            if (ys.size !== 1) malos.push(`compás con dos acordes n.º ${bi + 1}${marcado ? ' (marcado)' : ''}: ${ys.size} renglones`);
            const caja = b.getBoundingClientRect();
            if (rects.some((q) => q.right > caja.right + 1 || q.left < caja.left - 1)) malos.push(`compás con dos acordes n.º ${bi + 1}${marcado ? ' (marcado)' : ''}: se sale de su casilla`);
          }
          b.classList.remove('now');
          b.querySelectorAll('.cur').forEach((x) => x.classList.remove('cur'));
        });
        return { malos, dos: bars.length };
      });
      expect(r.dos).toBeGreaterThan(0);
      expect(r.malos).toEqual([]);
    });
  }
});
