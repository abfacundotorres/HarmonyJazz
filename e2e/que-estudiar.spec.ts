import { expect, test } from './helpers';
import type { Page } from '@playwright/test';

// Qué estudiar: los standards más repetidos en cuatro listas, en etapas; dice cuáles ya están en Mis temas y lleva a buscar el resto en la
// colección. Los cifrados de la prueba están inventados.
const AUTUMN = { id: 'u:autumnfake', name: 'Autumn Leaves', composer: '', key: 'G', mode: 'minor', chart: 'Am7 | D7 | Gmaj7 | Gmaj7', tempo: 120, style: 'swing' };
const conTemas = (page: Page, tunes: unknown[]) => page.addInitScript((t) => localStorage.setItem('harmonyjazz:library', JSON.stringify({ tunes: t })), tunes);
const tarjeta = (page: Page) => page.locator('details.estudio');
const COLECCION = Buffer.from(JSON.stringify([{ Title: 'C Jam Blues', Composer: 'Autor Uno', Key: 'C', Rhythm: 'Medium Swing', TimeSignature: '4/4', Sections: [{ Label: 'A', MainSegment: { Chords: 'C7|F7|C7|C7' } }] }, { Title: 'Otro tema', Composer: 'Autor Dos', Key: 'C', Rhythm: 'Medium Swing', TimeSignature: '4/4', Sections: [{ Label: 'A', MainSegment: { Chords: 'Cmaj7|Dm7|G7|Cmaj7' } }] }]));

test.describe('qué estudiar', () => {
  test('explica que el orden es criterio propio, cita las listas y propone el primer tema', async ({ page }) => {
    await page.goto('/#/repertorio');
    await tarjeta(page).locator('> summary').click();
    await expect(tarjeta(page)).toContainText('El orden es criterio propio');
    await expect(tarjeta(page).getByRole('link', { name: /Learn Jazz Standards: 50 Must-Know/ })).toBeVisible();
    await expect(tarjeta(page).getByRole('status')).toContainText('0 de');
    await expect(tarjeta(page).getByRole('status')).toContainText('Sigue: C-Jam Blues (etapa 1)');
    await expect(tarjeta(page).locator('details.etapa')).toHaveCount(4);
    await expect(tarjeta(page).locator('details.etapa').first()).toHaveAttribute('open', '');
  });

  test('lo que ya está en Mis temas se marca y se toca; el resto se busca en la colección', async ({ page }) => {
    await conTemas(page, [AUTUMN]);
    await page.goto('/#/repertorio');
    await tarjeta(page).locator('> summary').click();
    await expect(tarjeta(page).getByRole('status')).toContainText('1 de');
    const fila = tarjeta(page).locator('.colecc-lista li', { hasText: 'Autumn Leaves' });
    await expect(fila).toContainText('en 4 de 4 listas');
    await expect(fila).toContainText('✓ en Mis temas');
    await fila.getByRole('link', { name: 'Tocar Autumn Leaves' }).click();
    await expect(page).toHaveURL(/p=u%3Aautumnfake/);
    await expect(page.locator('.board .bar')).toHaveCount(4);
  });

  test('«Buscar en mi colección» abre la colección ya filtrada por ese tema', async ({ page }) => {
    await page.goto('/#/repertorio');
    await tarjeta(page).locator('> summary').click();
    await tarjeta(page).locator('.colecc-lista').getByRole('link', { name: 'Buscar C-Jam Blues en mi colección' }).click();
    await expect(page).toHaveURL(/buscar=c%20jam%20blues/);
    await expect(page.locator('details.coleccion')).toHaveAttribute('open', '');
    await page.locator('input[aria-label="Archivo de la colección"]').setInputFiles({ name: 'c.json', mimeType: 'application/json', buffer: COLECCION });
    await expect(page.locator('.colecc-buscar input')).toHaveValue('c jam blues');
    await expect(page.locator('.colecc-lista li')).toHaveCount(1);
    await expect(page.locator('.colecc-lista li')).toContainText('C Jam Blues');
  });

  test('los créditos citan las listas de las que sale', async ({ page }) => {
    await page.goto('/#/creditos');
    await expect(page.getByRole('heading', { name: 'Listas de temas para estudiar' })).toBeVisible();
    await expect(page.getByRole('link', { name: /JazzFuel/ })).toBeVisible();
  });
});
