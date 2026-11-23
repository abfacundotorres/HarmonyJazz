import { expect, test } from './helpers';
import type { Page } from '@playwright/test';

// Compases con acordes de distinta duración (2+1+1): se rotula el tiempo en que entra cada acorde y, en el atril, se dibujan en una sola fila
// con ancho proporcional a lo que duran. Temas inventados.
const T44 = { id: 'u:pulso44x', name: 'Tres en 4/4', composer: '', key: null, mode: 'major', chart: 'Dm7 | Em7 A7 A#dim7 | Bm7 Gmaj7 | Cmaj7', tempo: 90, style: 'swing' };
const T34 = { id: 'u:pulso34x', name: 'Dos en 3/4', composer: '', key: null, mode: 'major', chart: '@3/4 Dm7 G7 | Cmaj7 | Am7 D7 G7', tempo: 90, style: 'swing' };
const conTema = (page: Page, t: object) => page.addInitScript((x) => localStorage.setItem('harmonyjazz:library', JSON.stringify({ tunes: [x] })), t);
const compas = (page: Page, n: number) => page.locator('.card .board .bar').nth(n - 1);

test.describe('pulso de cada acorde en el compás', () => {
  test('con tres acordes en 4/4 se rotulan los tiempos 1, 3 y 4; con dos iguales no hay rótulos', async ({ page }) => {
    await conTema(page, T44);
    await page.goto('/#/playalong?p=u:pulso44x');
    await page.waitForSelector('.board');
    await expect(compas(page, 2).locator('.pulso')).toHaveText(['Tiempo 1', 'Tiempo 3', 'Tiempo 4']);
    await expect(compas(page, 3).locator('.pulso')).toHaveCount(0);
    await expect(compas(page, 1).locator('.pulso')).toHaveCount(0);
  });

  test('en 3/4, dos acordes (2+1) entran en los tiempos 1 y 3, y tres iguales en 1, 2 y 3', async ({ page }) => {
    await conTema(page, T34);
    await page.goto('/#/playalong?p=u:pulso34x');
    await page.waitForSelector('.board');
    await expect(compas(page, 1).locator('.pulso')).toHaveText(['Tiempo 1', 'Tiempo 3']);
    await expect(compas(page, 2).locator('.pulso')).toHaveCount(0);
    await expect(compas(page, 3).locator('.pulso')).toHaveText(['Tiempo 1', 'Tiempo 2', 'Tiempo 3']);
  });

  test('en el atril el compás 2+1+1 va en una sola fila, en orden y con ancho proporcional', async ({ page }) => {
    await conTema(page, T44);
    await page.goto('/#/playalong?p=u:pulso44x');
    await page.waitForSelector('.board');
    await page.getByRole('button', { name: 'Reproducir' }).first().click();
    const atril = page.getByRole('dialog', { name: 'Modo atril' });
    await expect(atril).toBeVisible({ timeout: 15_000 });
    const barra = atril.locator('.board .bar').nth(1);
    await expect(barra).toHaveClass(/prop/);
    await expect(barra).toHaveAttribute('style', /--cols: 2fr 1fr 1fr/);
    const cajas = await barra.locator(':scope > span').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()));
    expect(cajas).toHaveLength(3);
    // una sola fila (mismo alto de arranque, aprox.), de izquierda a derecha, y el primero ocupa el doble que cada uno de los otros
    expect(Math.abs(cajas[0].top - cajas[2].top)).toBeLessThan(cajas[0].height);
    expect(cajas[0].left).toBeLessThan(cajas[1].left);
    expect(cajas[1].left).toBeLessThan(cajas[2].left);
    const col = await barra.evaluate((e) => getComputedStyle(e).gridTemplateColumns.split(' ').map(parseFloat));
    expect(col[0] / col[1]).toBeCloseTo(2, 1);
    expect(col[1]).toBeCloseTo(col[2], 0);
    await atril.getByRole('button', { name: 'Detener' }).click();
  });
});
