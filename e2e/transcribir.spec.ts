import { expect, makeWav, openAudio, secs, test } from './helpers';
import type { Page } from '@playwright/test';

const time = async (page: Page) => secs(await page.locator('.timeread').innerText());
const play = (page: Page) => page.locator('.bigplay').click();
/** Abre un panel desplegable por su título (el texto del título aparece también en otros lugares). */
const panel = (page: Page, title: string) => page.locator('summary', { hasText: title }).click();

/** Arrastra sobre la onda para seleccionar entre dos fracciones del ancho. */
async function drag(page: Page, a: number, b: number) {
  const box = (await page.locator('canvas.wave').boundingBox())!;
  const y = box.y + 60;
  await page.mouse.move(box.x + box.width * a, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * ((a + b) / 2), y, { steps: 6 });
  await page.mouse.move(box.x + box.width * b, y, { steps: 6 });
  await page.mouse.up();
}

test.describe('Transcribir', () => {
  test('reproduce a la velocidad pedida', async ({ page }) => {
    await openAudio(page, await makeWav());
    await play(page);
    await page.waitForTimeout(400);
    const a0 = await time(page);
    await page.waitForTimeout(2000);
    const d100 = (await time(page)) - a0;
    expect(d100).toBeGreaterThan(1.7);
    expect(d100).toBeLessThan(2.4);
    await page.getByRole('group', { name: 'Velocidades frecuentes' }).getByRole('button', { name: '50', exact: true }).click();
    await page.waitForTimeout(500);
    const b0 = await time(page);
    await page.waitForTimeout(2500);
    const d50 = (await time(page)) - b0;
    expect(d50).toBeGreaterThan(1.0);
    expect(d50).toBeLessThan(1.6);
    await play(page);
  });

  test('el loop repite el tramo marcado sin salirse de él', async ({ page }) => {
    await openAudio(page, await makeWav());
    await drag(page, 0.2, 0.45);
    const sel = (await page.locator('.selection').innerText()).replace(/\s+/g, ' ');
    const m = /Selección:\s*([\d:.]+)\s*–\s*([\d:.]+)/.exec(sel)!;
    const [a, b] = [secs(m[1]), secs(m[2])];
    expect(b - a).toBeGreaterThan(2);
    await play(page);
    const ts: number[] = [];
    for (let i = 0; i < 28; i++) {
      await page.waitForTimeout(250);
      ts.push(await time(page));
    }
    for (const t of ts) {
      expect(t).toBeGreaterThanOrEqual(a - 0.3);
      expect(t).toBeLessThanOrEqual(b + 0.3);
    }
    expect(ts.some((t, i) => i > 0 && t < ts[i - 1] - 1), 'hubo al menos una vuelta del loop').toBe(true);
    await play(page);
  });

  test('el entrenador sube la velocidad solo hasta la meta', async ({ page }) => {
    await openAudio(page, await makeWav());
    // se acerca y se marca un tramo corto
    const box = (await page.locator('canvas.wave').boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.2, box.y + 70);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -500);
    await page.keyboard.up('Control');
    await page.waitForTimeout(300);
    await drag(page, 0.4, 0.55);
    await panel(page, 'Entrenador de loops');
    await page.getByRole('group', { name: 'Velocidades frecuentes' }).getByRole('button', { name: '60', exact: true }).click();
    await page.getByLabel('Subir la velocidad solo').check();
    await page.getByLabel('Sube (puntos)').fill('20');
    await page.getByLabel('Cada (repeticiones)').fill('1');
    const rate = () => page.locator('.rate b').innerText();
    await play(page);
    await expect.poll(rate, { timeout: 40_000 }).toBe('100 %');
    await expect(page.getByText(/meta alcanzada/)).toBeVisible();
    await play(page);
  });

  test('compases: loop de 2 compases, marcador, pasaje guardado y todo vuelve al recargar', async ({ page }) => {
    await openAudio(page, await makeWav());
    await panel(page, 'Compases y marcadores');
    await page.getByLabel('Tempo en negras por minuto').fill('100');
    await page.getByRole('button', { name: '＋ Marcador' }).click();
    await page.getByRole('button', { name: '2 compases' }).click();
    const len = /\(([\d.]+) s\)/.exec(await page.locator('.selection').innerText())!;
    expect(Number(len[1])).toBeCloseTo(4.8, 1); // 2 compases a 100 bpm
    await panel(page, 'Pasajes guardados');
    await page.getByLabel('Nombre del pasaje').fill('Frase A');
    await page.getByRole('button', { name: 'Guardar selección' }).click();
        await page.waitForTimeout(1200); // el guardado automático espera un instante
    await page.reload();
    await page.locator('.tracklist li button.link').first().click();
    await page.waitForSelector('canvas.wave');
    await expect(page.getByText('Pasajes guardados (1)')).toBeVisible();
    await panel(page, 'Compases y marcadores');
    await expect(page.getByLabel('Tempo en negras por minuto')).toHaveValue('100');
    await expect(page.locator('.panel', { hasText: 'Compases y marcadores' }).locator('li')).toHaveCount(1);
  });

  test('espectrograma y detección de notas', async ({ page }) => {
    await openAudio(page, await makeWav());
    await page.getByRole('button', { name: 'Espectrograma' }).click();
    await panel(page, 'Notas: detectar');
    await page.getByRole('button', { name: /Detectar notas/ }).click();
    await expect(page.getByText(/notas detectadas/)).toBeVisible({ timeout: 30_000 });
    expect(await page.locator('.notelist li').count()).toBeGreaterThanOrEqual(6);
  });

  test('estima la afinación del disco y la corrige', async ({ page }) => {
    await openAudio(page, await makeWav({ detuneCents: 30 }));
    await panel(page, 'Afinación y filtros');
    await page.getByRole('button', { name: 'Estimar la afinación del disco' }).click();
    const txt = await page.getByText(/Parece estar/).innerText();
    const cents = Number(/([+-]\d+)¢/.exec(txt)![1]);
    expect(Math.abs(cents - 30)).toBeLessThanOrEqual(8);
    await page.getByRole('button', { name: /Corregir/ }).click();
    const fine = Number(/(-?\d+) centésimas/.exec(await page.locator('label', { hasText: 'Ajuste fino' }).innerText())![1]);
    expect(fine).toBe(-cents);
  });

  test('el reproductor simple se puede elegir y se vuelve al preciso', async ({ page }) => {
    await openAudio(page, await makeWav());
    await page.getByLabel('Usar el reproductor simple').check();
    await expect(page.getByText(/Reproductor simple del navegador/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'Espectrograma' })).toBeDisabled();
    await play(page);
    await page.waitForTimeout(1200);
    expect(await time(page)).toBeGreaterThan(0.5);
    await play(page);
    await page.getByLabel('Usar el reproductor simple').uncheck();
    await expect(page.getByText('Motor preciso')).toBeVisible({ timeout: 30_000 });
  });

  test('borrar el audio abierto no deja una ficha fantasma', async ({ page }) => {
    await openAudio(page, await makeWav(), 'para-borrar.wav');
    page.on('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Borrar para-borrar' }).click();
    await page.waitForTimeout(1200);
    await page.reload();
    await expect(page.getByText('Todavía no cargaste audios.')).toBeVisible();
  });
});

test('Tu toma: se graba, se escucha, se guarda y se abre en Transcribir', async ({ page }) => {
  await page.goto('/#/playalong?p=rhythm');
  await page.waitForSelector('.player');
  await page.getByRole('button', { name: 'Activar micrófono' }).click();
  await page.getByRole('button', { name: /Grabar solo/ }).click();
  await page.waitForTimeout(3500);
  await page.getByRole('button', { name: /Terminar/ }).click();
  await expect(page.getByRole('heading', { name: 'Tu toma' })).toBeVisible();
  const audio = page.locator('section audio');
  await expect(audio).toBeVisible({ timeout: 15_000 });
  const dur = await audio.evaluate(async (a: HTMLAudioElement) => {
    if (a.readyState < 1) await new Promise((r) => a.addEventListener('loadedmetadata', r, { once: true }));
    return a.duration;
  });
  expect(Number.isFinite(dur), 'la toma tiene duración finita (WAV)').toBe(true);
  expect(dur).toBeGreaterThan(2.5);
  await page.getByRole('button', { name: 'Guardar en Transcribir' }).click();
  await page.waitForSelector('canvas.wave', { timeout: 30_000 });
  await expect(page.getByText('Motor preciso')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('section.card h3').first()).toContainText('Toma - ');
});
