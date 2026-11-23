import { abrirEstudio, expect, test } from './helpers';
import type { Page } from '@playwright/test';

// Ayuda memoria quieta: todos los acordes distintos del tema con guide tones, tensiones y escala. Tema inventado.
const TEMA = { id: 'u:fichatema', name: 'Tema de la ficha', composer: '', key: 'C', mode: 'major', chart: 'Dm7 | G7 | Cmaj7 | Dm7', tempo: 120, style: 'swing' };
const conTema = (page: Page) => page.addInitScript((t) => localStorage.setItem('harmonyjazz:library', JSON.stringify({ tunes: [t] })), TEMA);

test('la ayuda memoria lista cada acorde una vez, con sus compases y sus notas, y no depende del play', async ({ page }) => {
  await conTema(page);
  await page.goto('/#/playalong?p=u:fichatema');
  await page.waitForSelector('.board');
  await abrirEstudio(page);
  const ficha = page.locator('details.ficha');
  await expect(ficha.locator('.ficha-acorde')).toHaveCount(0); // cerrada: no calcula
  await ficha.locator('summary').click();
  const items = ficha.locator('.ficha-acorde');
  await expect(items).toHaveCount(3);
  // Si♭ por defecto: el Dm7 de concierto se lee Em7
  await expect(items.first()).toContainText('compases 1 y 4');
  await expect(items.first().locator('.ficha-cab .sym')).toContainText('E');
  await expect(items.first()).toContainText('Guide tones');
  await expect(items.first()).toContainText('Tensiones');
  await page.getByRole('button', { name: 'Concierto' }).click();
  await expect(items.first().locator('.ficha-cab .sym')).toContainText('D');
});
