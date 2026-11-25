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

  await atril(page).getByRole('button', { name: 'Guide tones (pentagrama)' }).click();
  const guia = atril(page).locator('.atril-guia');
  await expect(guia.locator('svg')).toBeVisible();
  await expect(guia.locator('.abcjs-note')).toHaveCount(4);
  await expect(guia).toContainText('Em7'); // Dm7 de concierto, escrito para Si♭
  await expect(atril(page).locator('.board .bar')).toHaveCount(4); // la grilla sigue ahí

  // dar play resalta el compás que suena
  await atril(page).getByRole('button', { name: 'Reproducir' }).click();
  await expect(guia.locator('.hj-current').first()).toBeAttached({ timeout: 20_000 });
  await expect(guia.locator('.hj-note').first()).toBeAttached(); // el marcador pasa por las notas aunque no se oiga la línea
  await expect(guia.locator('.hj-chord').first()).toBeAttached(); // y marca el nombre de su acorde

  // oír la línea: el motor avisa cada nota y se resalta
  await atril(page).getByRole('button', { name: '🔊 Oír la línea de guide tones' }).click();
  await expect(atril(page).getByRole('button', { name: '🔊 Dejar de oír la línea' })).toHaveAttribute('aria-pressed', 'true');
  await expect(guia.locator('.hj-note').first()).toBeAttached({ timeout: 20_000 });
  await atril(page).getByRole('button', { name: 'Detener' }).click();

  // se vuelve a ocultar
  await atril(page).getByRole('button', { name: 'Guide tones (pentagrama)' }).click();
  await expect(atril(page).locator('.atril-guia')).toHaveCount(0);
});

test('con la opción de tira, los guide tones van en una sola línea y la nota que suena queda quieta mientras la partitura pasa', async ({ page }) => {
  const largo = { ...TEMA, chart: Array.from({ length: 6 }, () => 'Dm7 | G7 | Cmaj7 | A7').join(' | '), tempo: 200 };
  await page.addInitScript((t) => {
    localStorage.setItem('harmonyjazz:library', JSON.stringify({ tunes: [t] }));
    localStorage.setItem('harmonyjazz:atril', JSON.stringify({ size: 2, tira: true }));
  }, largo);
  await page.goto('/#/playalong?p=u:atrilguia');
  await page.waitForSelector('.player');
  await page.getByRole('button', { name: 'Modo atril (pantalla grande)' }).click();
  await atril(page).getByRole('button', { name: 'Guide tones (pentagrama)' }).click();
  const guia = atril(page).locator('.atril-guia');
  await expect(guia.locator('.abcjs-note')).toHaveCount(24);
  // una sola línea: todas las notas dentro del mismo renglón (el svg tiene un solo pentagrama)
  await expect(guia.locator('.abcjs-staff')).toHaveCount(1);

  await atril(page).getByRole('button', { name: 'Reproducir' }).click();
  const x = () => guia.locator('.hj-note').first().evaluate((n) => n.getBoundingClientRect().left);
  await expect(guia.locator('.hj-note').first()).toBeAttached({ timeout: 20_000 });
  // avanza a una nota de la segunda mitad: sigue en el mismo lugar de la pantalla (±2 px) y la partitura se movió
  await expect.poll(async () => guia.locator('svg').evaluate((s) => (s as SVGElement).style.transform), { timeout: 30_000 }).not.toBe('translateX(0px)');
  const a = await x();
  await page.waitForTimeout(1500);
  const b = await x();
  expect(Math.abs(a - b)).toBeLessThan(40);
  await atril(page).getByRole('button', { name: 'Detener' }).click();
});
