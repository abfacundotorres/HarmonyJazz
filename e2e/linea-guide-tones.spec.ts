import { abrirEstudio, cambiarVista, expect, sinAtrilAutomatico, test } from './helpers';
import type { Page } from '@playwright/test';

// Línea de guide tones: una sola línea por la 3.ª/7.ª de cada acorde, con el movimiento mínimo. Tema inventado.
const TEMA = { id: 'u:lineatema', name: 'Tema de la línea', composer: '', key: 'C', mode: 'major', chart: 'Dm7 | G7 | Cmaj7 | Cmaj7', tempo: 120, style: 'swing' };
const conTema = (page: Page) => page.addInitScript((t) => localStorage.setItem('harmonyjazz:library', JSON.stringify({ tunes: [t] })), TEMA);

test('la línea de guide tones lista cada acorde con su nota y su movimiento, y se lee en Si♭ o en concierto', async ({ page }) => {
  await conTema(page);
  await page.goto('/#/playalong?p=u:lineatema');
  await page.waitForSelector('.board');
  await abrirEstudio(page);
  const linea = page.locator('details.linea');
  await expect(linea.locator('.linea-lista li')).toHaveCount(0); // cerrada: no calcula
  await linea.locator('> summary').click();
  // en pentagrama, con los acordes arriba y una nota por compás
  await expect(linea.locator('.linea-pentagrama svg')).toBeVisible();
  await expect(linea.locator('.linea-pentagrama .abcjs-note')).toHaveCount(4);
  await expect(linea.locator('.linea-pentagrama')).toContainText('Em7'); // Dm7 de concierto, escrito para Si♭
  await linea.getByText('Acorde por acorde').click();
  const filas = linea.locator('.linea-lista li');
  await expect(filas).toHaveCount(3); // el Cmaj7 repetido cuenta una vez
  await expect(filas.first()).toContainText('compás 1');
  await expect(filas.first()).toContainText('empieza');
  await expect(filas.nth(1)).toContainText(/↓ 1 semitono|= misma nota/); // C–B–B o F–F–E: ambas mueven un semitono en total
  const notasBb = await linea.locator('.linea-notas').innerText();
  expect(notasBb.split('→')).toHaveLength(3);

  // en concierto las notas son otras (un tono más abajo que escritas para Si♭)
  await cambiarVista(page, 'Concierto');
  await page.waitForSelector('.board');
  await abrirEstudio(page);
  await page.locator('details.linea > summary').click();
  await expect(page.locator('details.linea .linea-pentagrama')).toContainText('Dm7');
  const notasC = await page.locator('details.linea .linea-notas').innerText();
  expect(notasC).not.toBe(notasBb);
  expect(['C → B → B', 'F → F → E']).toContain(notasC.replace(/\s+/g, ' ').trim());
});

test('mientras suena el play-along se resalta en el pentagrama el compás que va sonando', async ({ page }) => {
  await sinAtrilAutomatico(page);
  await conTema(page);
  await page.goto('/#/playalong?p=u:lineatema');
  await page.waitForSelector('.board');
  await abrirEstudio(page);
  await page.locator('details.linea > summary').click();
  const pent = page.locator('details.linea .linea-pentagrama');
  await expect(pent.locator('svg')).toBeVisible();
  await expect(pent.locator('.hj-current')).toHaveCount(0); // sin sonar no hay compás resaltado
  await page.getByRole('button', { name: 'Reproducir' }).click();
  await expect(pent.locator('.hj-current').first()).toBeAttached({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Detener' }).first().click();
  await expect(pent.locator('.hj-current')).toHaveCount(0);
});
