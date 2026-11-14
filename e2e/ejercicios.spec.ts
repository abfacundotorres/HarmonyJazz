import { expect, test } from './helpers';

// 2026-11-14: calentamiento con notas largas, flexibilidad y bending (día % 5 = 1) y técnica cromática (día % 8 = 3)
const DIA = new Date(2026, 10, 14, 12, 0, 0);
// 2026-11-11: técnica de escala en terceras (día % 8 = 0), tonalidad del día E (concierto)
const DIA_TERCERAS = new Date(2026, 10, 11, 12, 0, 0);

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

test.describe('técnica del día: el pentagrama sale en la tonalidad del día', () => {
  test('escala en terceras, escrita para Si♭ y en concierto', async ({ page }) => {
    await page.clock.setFixedTime(DIA_TERCERAS);
    await page.goto('/#/hoy');
    const ex = page.locator('details.exercise', { hasText: 'Escala mayor de la tonalidad del día en terceras' });
    await ex.locator('summary').click();
    await expect(ex.locator('.paper svg')).toBeVisible();
    await expect(ex.getByText(/negra = 120/).first()).toBeVisible();
    const notes = await ex.locator('.paper svg .abcjs-note').count();
    expect(notes).toBeGreaterThanOrEqual(40);
    await page.getByRole('button', { name: 'Concierto' }).click();
    await expect(ex.locator('.paper svg')).toBeVisible();
    expect(await ex.locator('.paper svg .abcjs-note').count()).toBe(notes);
  });
});

test.describe('lecciones: cómo practicar cada ejercicio', () => {
  test('cada ejercicio trae su guía de práctica, desplegable y sin desborde', async ({ page }) => {
    await page.goto('/#/lecciones/guide-tones');
    const guias = page.locator('details.study', { hasText: 'Cómo practicar este ejercicio' });
    await expect(guias.first()).toBeVisible();
    expect(await guias.count()).toBeGreaterThanOrEqual(5);
    await guias.first().locator('summary').click();
    await expect(guias.first().getByText('El método, paso a paso')).toBeVisible();
    await expect(guias.first().getByText(/Un tempo de partida razonable: \d+ bpm/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
