import { expect, test } from './helpers';

const bar = (chords: string[], extra: object = {}) => ({ chords, ...extra });
const DOC = {
  bars: [
    bar(['Dm7'], { section: 'A', repeatStart: true }), bar(['G7b9']), bar(['Cmaj7']), bar(['Em7b5', 'A7alt'], { ending: 1, repeatEnd: true }),
    bar(['Cmaj7', 'A7'], { ending: 2 }), bar(['Dm7'], { section: 'B' }), bar(['G7#11']), bar(['Cmaj7']),
  ],
};
const TUNE = { id: 'u:grilla', name: 'Grilla de prueba', composer: '', key: 'C', mode: 'major', chart: 'Dm7 | G7b9 | Cmaj7 | Em7b5 A7alt | Dm7 | G7b9 | Cmaj7 | Cmaj7 A7 | Dm7 | G7#11 | Cmaj7', tempo: 120, style: 'swing', doc: DOC };

test.describe('grilla de reproducción', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((t) => {
      localStorage.setItem('harmonyjazz:library', JSON.stringify({ tunes: [t] }));
      localStorage.setItem('harmonyjazz:settings', JSON.stringify({ view: 'C' }));
    }, TUNE);
    await page.goto('/#/playalong?p=u:grilla');
    await page.waitForSelector('.board .bar');
  });

  test('muestra lo escrito: secciones, repeticiones y finales, 4 compases por fila y cifrado de iReal', async ({ page }) => {
    const bars = page.locator('.board .bar');
    await expect(bars).toHaveCount(8);
    await expect(page.locator('.board .sec')).toHaveText(['A', 'B']);
    await expect(page.locator('.board .bar.rs')).toHaveCount(1);
    await expect(page.locator('.board .bar.re')).toHaveCount(1);
    await expect(page.locator('.board .bar.end1')).toHaveCount(1);
    await expect(page.locator('.board .bar.end2')).toHaveCount(1);
    await expect(bars.nth(0)).toContainText('D-7');
    await expect(bars.nth(2)).toContainText('CΔ7');
    await expect(bars.nth(3)).toContainText('Eø7');
    await expect(bars.nth(1).locator('sup')).toHaveText('♭9');
    const ys = await bars.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(new Set(ys.slice(0, 4)).size).toBe(1);
    expect(ys[4]).toBeGreaterThan(ys[0]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.locator('.board').screenshot({ path: process.env.SHOT ?? 'test-results/grilla.png' });
  });

  test('el ajuste de cifrado completo muestra maj7 y m7', async ({ page }) => {
    await page.getByText('Más', { exact: true }).click();
    await page.getByLabel('Estilo de cifrado').selectOption('full');
    await expect(page.locator('.board .bar').nth(0)).toContainText('Dm7');
    await expect(page.locator('.board .bar').nth(2)).toContainText('Cmaj7');
  });

  test('al sonar, el compás actual se resalta y el loop se arma sobre lo escrito', async ({ page }) => {
    await page.locator('.board .bar').nth(1).click();
    await page.locator('.board .bar').nth(2).click();
    await expect(page.locator('.board .bar.inloop')).toHaveCount(2);
  });
});
