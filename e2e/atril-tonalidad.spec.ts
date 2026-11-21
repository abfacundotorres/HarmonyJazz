import { expect, test } from './helpers';
import type { Page } from '@playwright/test';

// Atril: dar play en el Play-along lo abre solo, se elige la tonalidad desde ahí (o ± ½ tono si el tema no tiene una fija) y la toma
// completa muestra su consigna adentro.
const SIN_TONALIDAD = { id: 'u:sinton', name: 'Sin tonalidad', composer: '', key: null, mode: 'major', chart: 'Cm7 | F7 | Bbmaj7 | Bbmaj7', tempo: 120, style: 'swing' };
const TOMA = { id: 'u:toma', name: 'Tema de toma', composer: '', key: 'C', mode: 'major', chart: 'Dm7 | G7 | Cmaj7 | Cmaj7', tempo: 120, style: 'swing' };
const conTemas = (page: Page) => page.addInitScript((t) => localStorage.setItem('harmonyjazz:library', JSON.stringify({ tunes: t })), [SIN_TONALIDAD, TOMA]);
const atril = (page: Page) => page.getByRole('dialog', { name: 'Modo atril' });
const primero = (page: Page) => atril(page).locator('.board .bar').first();

test.describe('atril: abrirlo al dar play', () => {
  test('dar play en el Play-along abre el atril con la grilla, y «Cerrar» vuelve', async ({ page }) => {
    await page.goto('/#/playalong?p=ii-v-i');
    await page.waitForSelector('.player');
    await expect(atril(page)).toHaveCount(0);
    await page.getByRole('button', { name: 'Reproducir' }).first().click();
    await expect(atril(page)).toBeVisible({ timeout: 15_000 });
    await expect(atril(page).locator('.board .bar')).toHaveCount(4);
    await atril(page).getByRole('button', { name: 'Cerrar el modo atril' }).click();
    await expect(atril(page)).toHaveCount(0);
    await expect(page.locator('.player')).toBeVisible();
    // sigue sonando y cerrarlo no lo vuelve a abrir
    await page.waitForTimeout(1500);
    await expect(atril(page)).toHaveCount(0);
    await page.getByRole('button', { name: 'Detener' }).first().click();
  });

  test('se apaga en Más → Ajustes y entonces dar play no lo abre', async ({ page }) => {
    await page.goto('/#/mas');
    const caja = page.getByLabel('Abrir el atril al dar play en el Play-along');
    await expect(caja).toBeChecked(); // por defecto, encendido
    await caja.uncheck();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:settings')!).autoAtril)).toBe(false);
    await page.goto('/#/playalong?p=ii-v-i');
    await page.waitForSelector('.player');
    await page.getByRole('button', { name: 'Reproducir' }).first().click();
    await expect(page.locator('.player .play.on')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1500);
    await expect(atril(page)).toHaveCount(0);
  });

  test('la pantalla completa se pide una sola vez, no en cada tiempo del compás (si no, se sale sola)', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __fs: number }).__fs = 0;
      Element.prototype.requestFullscreen = function () {
        (window as unknown as { __fs: number }).__fs++;
        return Promise.resolve();
      };
    });
    await page.goto('/#/playalong?p=ii-v-i');
    await page.waitForSelector('.player');
    await page.getByRole('button', { name: 'Reproducir' }).first().click();
    await expect(atril(page)).toBeVisible({ timeout: 15_000 });
    await expect(atril(page).locator('.bar.now')).toHaveCount(1, { timeout: 15_000 });
    await page.waitForTimeout(3000); // varios tiempos: cada uno actualiza la pantalla
    expect(await page.evaluate(() => (window as unknown as { __fs: number }).__fs)).toBe(1);
  });
});

test.describe('atril: cambiar la tonalidad', () => {
  test('un tema con tonalidad: se elige una de las 12 desde el atril y la grilla cambia ahí mismo', async ({ page }) => {
    await page.goto('/#/playalong?p=ii-v-i&k=C');
    await page.waitForSelector('.player');
    await page.getByRole('button', { name: /Modo atril/ }).click();
    await expect(atril(page)).toBeVisible();
    await expect(primero(page)).toContainText('E-7'); // concierto C, escrito para Si♭: Dm7 → Em7
    const boton = atril(page).getByRole('button', { name: 'Cambiar la tonalidad' });
    await expect(boton).toContainText('D'); // la tecla se lee escrita para Si♭
    await boton.click();
    const panel = atril(page).getByRole('group', { name: 'Tonalidad' });
    await expect(panel.getByRole('radio')).toHaveCount(12);
    await expect(panel).toContainText('Tocás en D (escrito para Si♭); en concierto suena en C');
    await panel.getByRole('radio', { name: 'F', exact: true }).click(); // escrita F = concierto E♭
    await expect(panel).toHaveCount(0); // se cierra al elegir
    await expect(page).toHaveURL(/k=Eb/);
    await expect(primero(page)).toContainText('G-7'); // Fm7 de concierto → G-7 escrito
    await expect(atril(page).getByRole('button', { name: 'Cambiar la tonalidad' })).toContainText('F');
    // el atril sigue abierto
    await expect(atril(page)).toBeVisible();
  });

  test('un tema sin tonalidad fija sube y baja de a medio tono desde el atril', async ({ page }) => {
    await conTemas(page);
    await page.goto('/#/playalong?p=u%3Asinton');
    await page.waitForSelector('.player');
    await page.getByRole('button', { name: /Modo atril/ }).click();
    const boton = atril(page).getByRole('button', { name: 'Cambiar la tonalidad' });
    await expect(boton).toContainText('original');
    const antes = await primero(page).innerText();
    await boton.click();
    await atril(page).getByRole('button', { name: 'Subir un semitono' }).click();
    await expect(boton).toContainText('+1');
    await expect.poll(() => primero(page).innerText()).not.toBe(antes);
    await atril(page).getByRole('button', { name: 'Subir un semitono' }).click();
    await expect(boton).toContainText('+2');
    await atril(page).getByRole('button', { name: 'Volver al original' }).click();
    await expect(boton).toContainText('original');
    await expect.poll(() => primero(page).innerText()).toBe(antes);
  });

  test('la tonalidad se puede cambiar con el tema sonando', async ({ page }) => {
    await page.goto('/#/playalong?p=ii-v-i&k=C');
    await page.waitForSelector('.player');
    await page.getByRole('button', { name: 'Reproducir' }).first().click();
    await expect(atril(page)).toBeVisible({ timeout: 15_000 });
    await expect(atril(page).locator('.bar.now')).toHaveCount(1, { timeout: 15_000 });
    await atril(page).getByRole('button', { name: 'Cambiar la tonalidad' }).click();
    await atril(page).getByRole('group', { name: 'Tonalidad' }).getByRole('radio', { name: 'G', exact: true }).click();
    await expect(page).toHaveURL(/k=F(&|$)/);
    await expect(primero(page)).toContainText('A-7');
    await expect(atril(page).getByRole('button', { name: 'Detener' })).toBeVisible(); // sigue sonando
    await atril(page).getByRole('button', { name: 'Detener' }).click();
  });
});

test('la toma completa muestra su consigna dentro del atril', async ({ page }) => {
  test.setTimeout(60_000);
  await conTemas(page);
  await page.goto('/#/playalong?p=u%3Atoma');
  await page.waitForSelector('.player');
  await page.locator('.player input[type="range"]').first().fill('320');
  await page.getByText('Grabar una toma completa').click();
  await page.getByRole('button', { name: /Empezar la toma/ }).click();
  await expect(atril(page)).toBeVisible({ timeout: 20_000 }); // dar play abre el atril
  await expect(atril(page).locator('.atril-consigna')).toContainText('Coro 1 de 3: Tocá la melodía', { timeout: 20_000 });
  await expect(atril(page).locator('.atril-consigna')).toContainText('Coro 2 de 3: Improvisá', { timeout: 20_000 });
  // al terminar la consigna desaparece y «Tu toma» espera detrás
  await expect(atril(page).locator('.atril-consigna')).toHaveCount(0, { timeout: 30_000 });
  await atril(page).getByRole('button', { name: 'Cerrar el modo atril' }).click();
  await expect(page.getByRole('heading', { name: 'Tu toma' })).toBeVisible({ timeout: 30_000 });
});
