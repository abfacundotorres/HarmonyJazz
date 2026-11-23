import { abrirEstudio, expect, test } from './helpers';
import type { Page } from '@playwright/test';

// Mapa armónico: los patrones del tema con sus compases, el centro tonal y un botón para dejarlos en loop. Temas inventados.
const TEMA = { id: 'u:mapatema', name: 'Tema del mapa', composer: '', key: 'C', mode: 'major', chart: 'Dm7 | G7 | Cmaj7 | Cmaj7 | Gm7 | C7 | Fmaj7 | Fmaj7', tempo: 120, style: 'swing' };
const conTema = (page: Page) => page.addInitScript((t) => localStorage.setItem('harmonyjazz:library', JSON.stringify({ tunes: [t] })), TEMA);
const mapa = (page: Page) => page.locator('details.mapa');

test.describe('mapa armónico', () => {
  test('lista los patrones con sus compases y la tonalidad', async ({ page }) => {
    await conTema(page);
    await page.goto('/#/playalong?p=u:mapatema');
    await page.waitForSelector('.board');
    await abrirEstudio(page);
    await expect(mapa(page).locator('.mapa-lista')).toHaveCount(0); // cerrado: no calcula
    await mapa(page).locator('summary').click();
    // se lee como se ve: en Si♭ (por defecto) la tonalidad de concierto C se escribe D
    await expect(mapa(page).locator('p', { hasText: 'Tonalidad:' })).toContainText('D mayor');
    await expect(mapa(page).locator('.mapa-lista li')).toHaveCount(2);
    await expect(mapa(page).locator('.mapa-lista li').first()).toContainText('ii–V–I mayor en D');
    await expect(mapa(page).locator('.mapa-lista li').first()).toContainText('compases 1–3');
    await expect(mapa(page).locator('.mapa-lista li').nth(1)).toContainText('compases 5–7');
    await expect(mapa(page)).toContainText('Pasa por');
  });

  test('en concierto se lee con los acordes de concierto', async ({ page }) => {
    await conTema(page);
    await page.addInitScript(() => localStorage.setItem('harmonyjazz:settings', JSON.stringify({ view: 'C' })));
    await page.goto('/#/playalong?p=u:mapatema');
    await page.waitForSelector('.board');
    await abrirEstudio(page);
    await mapa(page).locator('summary').click();
    await expect(mapa(page).locator('.mapa-lista li').first()).toContainText('ii–V–I mayor en C');
  });

  test('«Repetir estos compases» deja el tramo en loop', async ({ page }) => {
    await conTema(page);
    await page.goto('/#/playalong?p=u:mapatema');
    await page.waitForSelector('.board');
    await abrirEstudio(page);
    await mapa(page).locator('summary').click();
    await mapa(page).getByRole('button', { name: /Repetir en bucle/ }).nth(1).click();
    await expect(page.locator('.loopbar')).toContainText('compases 5–7');
  });

  test('un tema modal sin patrones lo dice sin inventar', async ({ page }) => {
    await page.goto('/#/playalong?p=modal');
    await page.waitForSelector('.board');
    await abrirEstudio(page);
    await mapa(page).locator('summary').click();
    await expect(mapa(page)).toContainText('No se reconoció ningún patrón');
  });
});
