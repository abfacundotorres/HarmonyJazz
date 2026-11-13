import { expect, test } from './helpers';

const chords = (page: import('@playwright/test').Page) =>
  page.locator('.ced-bar:not(.add) .ced-chords').allInnerTexts().then((a) => a.map((t) => t.replace(/\s+/g, ' ').trim()));

async function openWithBlues(page: import('@playwright/test').Page) {
  await page.goto('/#/playalong');
  await page.getByText(/Mis temas/).first().click();
  await page.getByText('Atajos: acordes de la tonalidad y plantillas').click();
  await page.getByLabel('Tonalidad de los atajos').selectOption('C');
  await page.getByRole('button', { name: 'Blues de jazz (12 compases)' }).click();
  await expect(page.locator('.ced-bar:not(.add)')).toHaveCount(12);
}

test.describe('editor de grilla: comodidad', () => {
  test('rango: copiar, pegar, repetir y borrar compases', async ({ page }) => {
    await openWithBlues(page);
    const bars = page.locator('.ced-bar:not(.add)');
    const base = await chords(page);
    await bars.nth(0).click();
    await page.getByRole('button', { name: 'Elegir rango' }).click();
    await bars.nth(3).click();
    await expect(page.getByRole('button', { name: /Rango: 4 compases/ })).toBeVisible();
    await expect(page.locator('.ced-bar.insel')).toHaveCount(4);
    await page.getByRole('button', { name: 'Copiar' }).click();
    await page.getByRole('button', { name: /Rango:/ }).click();
    await bars.nth(11).click();
    await page.getByRole('button', { name: /^Pegar \(4\)/ }).click();
    expect(await chords(page)).toEqual([...base, ...base.slice(0, 4)]);
    await page.getByRole('button', { name: 'Borrar 4' }).click();
    await expect(page.locator('.ced-bar:not(.add)')).toHaveCount(12);
    await bars.nth(0).click();
    await page.getByRole('button', { name: 'Repetir' }).click();
    expect(await chords(page)).toEqual([base[0], base[0], ...base.slice(1)]);
  });

  test('avanzar solo: al elegir raíz y calidad pasa al acorde siguiente; se puede apagar', async ({ page }) => {
    await page.goto('/#/playalong');
    await page.getByText(/Mis temas/).first().click();
    await page.getByRole('button', { name: 'Agregar compás al final' }).click();
    await page.locator('.ced-bar:not(.add)').first().click();
    await page.getByRole('group', { name: 'Raíz' }).getByRole('button', { name: 'D', exact: true }).click();
    await page.getByRole('group', { name: 'Calidad' }).getByRole('button', { name: 'm7', exact: true }).click();
    await expect(page.locator('.ced-bar.sel')).toHaveAttribute('aria-label', /Compás 2/);
    await page.getByRole('group', { name: 'Raíz' }).getByRole('button', { name: 'G', exact: true }).click();
    await page.getByLabel('Avanzar solo').uncheck();
    await page.getByRole('group', { name: 'Calidad' }).getByRole('button', { name: '7', exact: true }).click();
    await expect(page.locator('.ced-bar.sel')).toHaveAttribute('aria-label', /Compás 2: G7/);
  });

  test('en el celular el teclado queda fijo abajo y la grilla muestra 4 compases por fila', async ({ page }) => {
    await openWithBlues(page);
    const ys = await page.locator('.ced-bar:not(.add)').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(new Set(ys.slice(0, 4)).size).toBe(1);
    await page.locator('.ced-bar:not(.add)').first().scrollIntoViewIfNeeded();
    await page.locator('.ced-bar:not(.add)').first().click();
    const box = await page.locator('.ced-keypad').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(844 + 1);
    expect(box!.y + box!.height).toBeGreaterThan(700);
    await page.screenshot({ path: process.env.SHOT ?? 'test-results/editor.png' });
  });
});

test.describe('editor de grilla: escuchar mientras se edita', () => {
  test('suena, resalta el compás que toca y una edición entra en la vuelta siguiente sin cortar', async ({ page }) => {
    await page.goto('/#/playalong');
    await page.getByText(/Mis temas/).first().click();
    await page.getByLabel('Tempo').fill('320');
    const slot = (n: number) => page.getByLabel(`Acorde 1 del compás ${n}`);
    await slot(1).fill('Dm7');
    await page.getByRole('button', { name: 'Agregar compás al final' }).click();
    await slot(2).fill('G7');
    await page.getByRole('button', { name: 'Escuchar la grilla' }).click();
    await expect(page.getByRole('button', { name: 'Detener' })).toBeVisible();
    await expect(page.locator('.ced-bar.now')).toHaveCount(1, { timeout: 15_000 });
    // se agrega un tercer compás mientras suena: no se detiene
    await page.getByRole('button', { name: 'Agregar compás al final' }).click();
    await slot(3).fill('Cmaj7');
    // en la vuelta siguiente entra el compás nuevo
    await expect(page.locator('.ced-bar').nth(2)).toHaveClass(/now/, { timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Detener' })).toBeVisible();
    await page.getByRole('button', { name: 'Detener' }).click();
    await expect(page.getByRole('button', { name: 'Escuchar la grilla' })).toBeVisible();
    await expect(page.locator('.ced-bar.now')).toHaveCount(0);
  });

  test('con acordes vacíos avisa y no empieza; volver a tocar después de detener funciona', async ({ page }) => {
    await page.goto('/#/playalong');
    await page.getByText(/Mis temas/).first().click();
    await page.getByRole('button', { name: 'Escuchar la grilla' }).click();
    await expect(page.getByRole('alert')).toContainText('acordes válidos');
    await page.getByLabel('Tempo').fill('320');
    await page.getByLabel('Acorde 1 del compás 1').fill('Cmaj7');
    await page.getByRole('button', { name: 'Escuchar la grilla' }).click();
    await page.getByRole('button', { name: 'Detener' }).click();
    await page.getByRole('button', { name: 'Escuchar la grilla' }).click();
    await expect(page.getByRole('button', { name: 'Detener' })).toBeVisible();
    await expect(page.locator('.ced-bar.now')).toHaveCount(1, { timeout: 15_000 });
  });
});
