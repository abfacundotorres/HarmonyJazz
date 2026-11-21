import { expect, test } from './helpers';

// Modo de memoria: la grilla se oculta (no el número ni la sección ni el compás que suena) y «Mirar» la muestra.
async function abrir(page: import('@playwright/test').Page, tema?: RegExp) {
  await page.goto('/#/playalong');
  await expect(page.locator('.board .bar').first()).toBeVisible(); // la pantalla tiene que haber terminado de cargar: si no, pisa lo elegido
  if (tema) {
    const sel = page.locator('select', { hasText: 'ii–V–I mayor' }).first();
    const opts = await sel.locator('option').allTextContents();
    await sel.selectOption({ label: opts.find((o) => tema.test(o))! });
    await expect(sel).not.toHaveValue('ii-v-i');
  }
}
const modo = (page: import('@playwright/test').Page, n: string) => page.getByRole('button', { name: n, exact: true });

test('por defecto la grilla se ve y el modo de memoria está en «Visible»', async ({ page }) => {
  await abrir(page);
  await expect(page.locator('.board .bar.hid')).toHaveCount(0);
  await expect(page.locator('.board')).toContainText('A7');
  await expect(modo(page, 'Visible')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /Mirar/ })).toHaveCount(0);
});

test('«Oculto» tapa todos los acordes, también el panel del acorde actual, y «Mirar» los muestra', async ({ page }) => {
  await abrir(page);
  const n = await page.locator('.board .bar').count();
  await modo(page, 'Oculto').click();
  await expect(page.locator('.board .bar.hid')).toHaveCount(n);
  const texto = await page.locator('.board').innerText();
  expect(texto).not.toMatch(/[ΔΑ7ø]|[A-G][b#♭♯]?[-m]/); // ningún símbolo de acorde: sólo los números de compás y los puntos
  await expect(page.locator('.current')).toContainText('Modo de memoria');
  // los lectores de pantalla tampoco reciben los acordes
  await expect(page.getByRole('button', { name: 'Compás 1 Acordes ocultos' })).toBeVisible();

  await page.getByRole('button', { name: /Mirar/ }).click();
  await expect(page.locator('.board .bar.hid')).toHaveCount(0);
  await expect(page.locator('.board')).toContainText('A7');
  await page.getByRole('button', { name: /Mirar/ }).click();
  await expect(page.locator('.board .bar.hid')).toHaveCount(n);
});

test('«Comienzos» deja ver sólo el primer compás de cada parte', async ({ page }) => {
  await abrir(page, /blues/i);
  await expect.poll(() => page.locator('.board .bar').count()).toBeGreaterThanOrEqual(8); // se dibuja el blues
  const n = await page.locator('.board .bar').count();
  await modo(page, 'Comienzos').click();
  const visibles = await page.locator('.board .bar:not(.hid)').count();
  expect(visibles).toBeGreaterThanOrEqual(1);
  expect(visibles).toBeLessThan(n);
  await expect(page.locator('.board .bar').first()).not.toHaveClass(/hid/); // el primero siempre
  await expect(page.locator('.board .bar.hid').first()).toBeVisible();
});

test('el modo se guarda y vuelve al recargar', async ({ page }) => {
  await abrir(page);
  await modo(page, 'Oculto').click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('harmonyjazz:memoria'))).toContain('oculto');
  await page.reload();
  await expect(page.locator('.board .bar.hid').first()).toBeVisible();
  await expect(modo(page, 'Oculto')).toHaveAttribute('aria-pressed', 'true');
});

test('un dato guardado dañado no rompe la pantalla y vuelve a «Visible»', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('harmonyjazz:memoria', '{"modo":"cualquiera"}'));
  await abrir(page);
  await expect(page.locator('.board .bar.hid')).toHaveCount(0);
  await expect(modo(page, 'Visible')).toHaveAttribute('aria-pressed', 'true');
});

test('el atril usa el mismo modo: cambia de uno en uno y «Mirar» aparece sólo si hay algo oculto', async ({ page }) => {
  await abrir(page);
  await page.getByRole('button', { name: /Modo atril/ }).click();
  const atril = page.locator('.atril');
  await expect(atril.locator('.bar.hid')).toHaveCount(0);
  await expect(atril.getByRole('button', { name: 'Mirar los acordes' })).toHaveCount(0);
  await atril.getByRole('button', { name: /Modo de memoria/ }).click(); // Visible → Comienzos
  await expect(atril.getByRole('button', { name: /Modo de memoria: Comienzos/ })).toBeVisible();
  await atril.getByRole('button', { name: /Modo de memoria/ }).click(); // → Oculto
  const n = await atril.locator('.board .bar').count();
  await expect(atril.locator('.bar.hid')).toHaveCount(n);
  await expect(atril.getByRole('button', { name: 'Mirar los acordes' })).toBeVisible();
  await atril.getByRole('button', { name: 'Mirar los acordes' }).click();
  await expect(atril.locator('.bar.hid')).toHaveCount(0);
  // la barra de abajo entra en el ancho de un celular chico
  const ancho = await page.evaluate(() => { const b = document.querySelector('.atril-bar')!; return [b.scrollWidth, b.clientWidth]; });
  expect(ancho[0]).toBeLessThanOrEqual(ancho[1]);
});
