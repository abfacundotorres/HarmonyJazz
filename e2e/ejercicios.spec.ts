import { expect, test } from './helpers';

// 2026-11-13 cae en el calentamiento con notas largas, flexibilidad y bending (día número % 3 = 1)
const DIA = new Date(2026, 10, 13, 12, 0, 0);

test.describe('ejercicios de práctica con explicación completa', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(DIA);
    await page.goto('/#/hoy');
  });

  test('cada ejercicio se despliega con su explicación y su pentagrama, y respeta Si♭ o concierto', async ({ page }) => {
    const ex = page.locator('details.exercise', { hasText: 'Notas largas en el registro grave' });
    await expect(ex).toBeVisible();
    await expect(ex.locator('.ex-body')).toBeHidden();
    await ex.locator('summary').click();
    await expect(ex.getByText('Metrónomo: 60 bpm')).toBeVisible();
    await expect(ex.getByText(/negra, negra, blanca, blanca, redonda/)).toBeVisible();
    await expect(ex.getByText(/Sin crescendo ni diminuendo/)).toBeVisible();
    await expect(ex.locator('.paper svg')).toBeVisible();
    await expect(ex.getByText(/escrito para trompeta en Si♭/)).toBeVisible();
    const notesBb = await ex.locator('.paper svg .abcjs-note').count();
    expect(notesBb).toBeGreaterThanOrEqual(10);
    await page.screenshot({ path: process.env.SHOT ?? 'test-results/ejercicio.png', fullPage: true });
    // las otras dos
    for (const t of ['Flexibilidad: armónicos', 'Bending: bajar y subir']) {
      const e = page.locator('details.exercise', { hasText: t });
      await e.locator('summary').click();
      await expect(e.locator('.paper svg')).toBeVisible();
    }
    // en concierto se transpone el pentagrama
    await page.getByRole('button', { name: 'Concierto' }).click();
    await expect(ex.getByText(/en concierto/)).toBeVisible();
  });

  test('no hay desborde horizontal con la explicación abierta', async ({ page }) => {
    await page.locator('details.exercise').first().locator('summary').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
