import { expect, test } from './helpers';
import type { Page } from '@playwright/test';

// Atril con la línea de guide tones: pentagrama arriba de la grilla, con el compás que suena y, si se oye la línea, la nota. Tema inventado.
const TEMA = { id: 'u:atrilguia', name: 'Tema del atril', composer: '', key: 'C', mode: 'major', chart: 'Dm7 | G7 | Cmaj7 | Cmaj7', tempo: 120, style: 'swing' };
const conTema = (page: Page) => page.addInitScript((t) => localStorage.setItem('harmonyjazz:library', JSON.stringify({ tunes: [t] })), TEMA);
const atril = (page: Page) => page.getByRole('dialog', { name: 'Modo atril' });

test('el atril muestra la línea de guide tones en pentagrama, resalta el compás y la nota que suena', async ({ page }) => {
  await conTema(page);
  await page.goto('/#/playalong?p=u:atrilguia');
  await page.waitForSelector('.player');
  await page.getByRole('button', { name: 'Modo atril (pantalla grande)' }).click();
  await expect(atril(page)).toBeVisible();
  await expect(atril(page).locator('.atril-guia')).toHaveCount(0); // por defecto sólo la grilla

  await atril(page).getByRole('button', { name: '𝄞 Guide tones' }).click();
  const guia = atril(page).locator('.atril-guia');
  await expect(guia.locator('svg')).toBeVisible();
  await expect(guia.locator('.abcjs-note')).toHaveCount(4);
  await expect(guia).toContainText('Em7'); // Dm7 de concierto, escrito para Si♭
  await expect(atril(page).locator('.board .bar')).toHaveCount(4); // la grilla sigue ahí

  // dar play resalta el compás que suena
  await atril(page).getByRole('button', { name: 'Reproducir' }).click();
  await expect(guia.locator('.hj-current').first()).toBeAttached({ timeout: 20_000 });
  await expect(guia.locator('.hj-note')).toHaveCount(0); // sin «oír la línea» no se marca la nota

  // oír la línea: el motor avisa cada nota y se resalta
  await atril(page).getByRole('button', { name: '🔊 Oír la línea' }).click();
  await expect(atril(page).getByRole('button', { name: '🔊 Dejar de oírla' })).toHaveAttribute('aria-pressed', 'true');
  await expect(guia.locator('.hj-note').first()).toBeAttached({ timeout: 20_000 });
  await atril(page).getByRole('button', { name: 'Detener' }).click();

  // se vuelve a ocultar
  await atril(page).getByRole('button', { name: '𝄞 Guide tones' }).click();
  await expect(atril(page).locator('.atril-guia')).toHaveCount(0);
});
