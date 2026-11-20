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

  test('lo detectado se pasa a la melodía de un tema propio, desde el compás elegido y sin pisar lo anterior', async ({ page }) => {
    const chart = Array.from({ length: 4 }, () => 'Dm7 | G7 | Cmaj7 | Cmaj7').join(' | ');
    await page.addInitScript((c) => {
      if (!localStorage.getItem('harmonyjazz:library')) localStorage.setItem('harmonyjazz:library', JSON.stringify({ tunes: [{ id: 'u:hoja', name: 'Hojas de otoño', composer: '', key: 'C', mode: 'major', chart: c, tempo: 120, style: 'swing', melody: 'C4:8' }] }));
    }, chart);
    await openAudio(page, await makeWav());
    await page.getByRole('button', { name: 'Espectrograma' }).click();
    await panel(page, 'Notas: detectar');
    await expect(page.getByRole('button', { name: 'Pasar a la melodía de un tema' })).toHaveCount(0);
    await page.getByRole('button', { name: /Detectar notas/ }).click();
    await expect(page.getByText(/notas detectadas/)).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Pasar a la melodía de un tema' }).click();
    await expect(page.getByLabel('Tema destino')).toHaveValue('u:hoja');
    await page.getByLabel('Desde el compás').fill('2');
    page.once('dialog', (d) => void d.accept('100'));
    await page.getByRole('button', { name: 'Poner en la melodía' }).click();
    await expect(page.getByText(/Listo: puse la frase en «Hojas de otoño», desde el compás 2/)).toBeVisible();
    const melody: string = await page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:library')!).tunes[0].melody);
    // lo que había en el compás 1 se conserva y lo nuevo empieza en el compás 2
    expect(melody.startsWith('C4:8 ')).toBe(true);
    expect(melody.split(' ').length).toBeGreaterThanOrEqual(7);
  });

  test('sin temas propios, pasar a la melodía explica cómo cargar uno', async ({ page }) => {
    await openAudio(page, await makeWav());
    await page.getByRole('button', { name: 'Espectrograma' }).click();
    await panel(page, 'Notas: detectar');
    await page.getByRole('button', { name: /Detectar notas/ }).click();
    await expect(page.getByText(/notas detectadas/)).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Pasar a la melodía de un tema' }).click();
    await expect(page.getByText(/Todavía no cargaste ningún tema/)).toBeVisible();
  });

  test('compara mi transcripción con la detectada y explica las diferencias', async ({ page }) => {
    await openAudio(page, await makeWav());
    await page.getByRole('button', { name: 'Espectrograma' }).click();
    await panel(page, 'Notas: detectar');
    await expect(page.getByRole('button', { name: 'Comparar con mi transcripción' })).toHaveCount(0);
    await page.getByRole('button', { name: /Detectar notas/ }).click();
    await expect(page.getByText(/notas detectadas/)).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Comparar con mi transcripción' }).click();
    const caja = page.locator('fieldset.compare');
    // la app muestra las notas como se leen en Si♭: se copian las seis primeras que detecta en el audio de prueba (a 100 bpm)
    await caja.getByRole('button', { name: /Escribí para trompeta/ }).click();
    await caja.getByLabel('Notas').fill('C4:1 E4:2 G4:2 F4:1 D4:1 E4:2');
    page.once('dialog', (d) => void d.accept('100'));
    await caja.getByRole('button', { name: 'Comparar', exact: true }).click();
    const res = caja.locator('.cmpresult');
    await expect(res).toContainText('Tu versión tiene 6 notas');
    // las seis que escribió coinciden con lo detectado (tolerando una corchea); lo demás son diferencias explicadas
    const coinciden = Number(/Coinciden (\d+)/.exec(await res.innerText())![1]);
    expect(coinciden).toBeGreaterThanOrEqual(4);
    await expect(res.locator('ol.diffs li').first()).toContainText('Quién probablemente tiene razón');
    await expect(res.getByText('Nota de más').first()).toBeVisible();
    await expect(res.getByRole('button', { name: '▶ Escuchar mi versión' })).toBeVisible();
    // las mismas notas con la lectura equivocada (concierto): todas difieren en dos semitonos y se avisa una sola vez
    await caja.getByRole('button', { name: /Escribí en concierto/ }).click();
    page.once('dialog', (d) => void d.accept('100'));
    await caja.getByRole('button', { name: 'Comparar', exact: true }).click();
    await expect(res.getByRole('status')).toContainText('lectura');
    await expect(res.getByRole('status')).toContainText('en Si♭ lo que marcaste como concierto');
    // consejos y elecciones: con la lectura correcta se elige la detectada en la primera diferencia y se aplica
    await caja.getByRole('button', { name: /Escribí para trompeta/ }).click();
    page.once('dialog', (d) => void d.accept('100'));
    await caja.getByRole('button', { name: 'Comparar', exact: true }).click();
    await expect(res.getByRole('list', { name: 'Consejos' })).toBeVisible();
    const antes = await caja.getByLabel('Notas').inputValue();
    await res.getByRole('button', { name: 'Uso la detectada' }).first().click();
    await expect(res.getByRole('button', { name: 'Uso la detectada' }).first()).toHaveAttribute('aria-pressed', 'true');
    await res.getByRole('button', { name: 'Aplicar mis elecciones a mi transcripción' }).click();
    await expect(page.getByText(/Apliqué 1 cambio a tu transcripción/)).toBeVisible();
    expect(await caja.getByLabel('Notas').inputValue()).not.toBe(antes);
    await expect(caja.locator('.cmpresult')).toHaveCount(0);
  });

  test('lo que se escribe mal se avisa y con un tema se ubica por compás y tiempo', async ({ page }) => {
    const chart = Array.from({ length: 4 }, () => 'Dm7 | G7 | Cmaj7 | Cmaj7').join(' | ');
    await page.addInitScript((c) => {
      if (!localStorage.getItem('harmonyjazz:library')) localStorage.setItem('harmonyjazz:library', JSON.stringify({ tunes: [{ id: 'u:hoja', name: 'Hojas de otoño', composer: '', key: 'C', mode: 'major', chart: c, tempo: 120, style: 'swing' }] }));
    }, chart);
    await openAudio(page, await makeWav());
    await page.getByRole('button', { name: 'Espectrograma' }).click();
    await panel(page, 'Notas: detectar');
    await page.getByRole('button', { name: /Detectar notas/ }).click();
    await expect(page.getByText(/notas detectadas/)).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Comparar con mi transcripción' }).click();
    const caja = page.locator('fieldset.compare');
    await caja.getByLabel('Notas').fill('H9');
    await caja.getByRole('button', { name: 'Comparar', exact: true }).click();
    await expect(caja.getByRole('alert')).toContainText('No entiendo la nota');
    await caja.getByLabel('Notas').fill('C4:1 E4:2 G4:2');
    await caja.getByLabel('Tema para el contexto').selectOption('u:hoja');
    await caja.getByLabel('Compás de comienzo').fill('2');
    page.once('dialog', (d) => void d.accept('100'));
    await caja.getByRole('button', { name: 'Comparar', exact: true }).click();
    await expect(caja.locator('ol.diffs li').first()).toContainText(/compás \d+, tiempo \d/);
    await expect(caja.locator('ol.diffs li').first()).toContainText('Quién probablemente tiene razón');
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

test('retroceder y avanzar 5 s, y el transporte sigue a la vista al bajar a los paneles', async ({ page }) => {
  await openAudio(page, await makeWav({ seconds: 20 }));
  const time = async () => secs((await page.locator('.timeread').textContent())!);
  await page.getByRole('button', { name: 'Avanzar 5 segundos' }).click();
  await page.getByRole('button', { name: 'Avanzar 5 segundos' }).click();
  expect(await time()).toBeCloseTo(10, 0);
  await page.getByRole('button', { name: 'Retroceder 5 segundos' }).click();
  expect(await time()).toBeCloseTo(5, 0);
  await page.getByRole('button', { name: 'Retroceder 5 segundos' }).click();
  await page.getByRole('button', { name: 'Retroceder 5 segundos' }).click();
  expect(await time()).toBe(0);
  // no pasa del final
  for (let i = 0; i < 6; i++) await page.getByRole('button', { name: 'Avanzar 5 segundos' }).click();
  expect(await time()).toBeLessThanOrEqual(20);
  await page.locator('summary', { hasText: 'Apuntes' }).scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, 200));
  await expect(page.locator('.bigplay')).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('la selección pasa al tramo siguiente y al anterior, y se acorta o duplica', async ({ page }) => {
  await openAudio(page, await makeWav({ seconds: 20 }));
  const sel = page.locator('.selection');
  await page.getByRole('button', { name: 'Avanzar 5 segundos' }).click();
  await page.getByRole('button', { name: 'Inicio aquí [' }).click();
  await page.getByRole('button', { name: 'Avanzar 5 segundos' }).click();
  await page.getByRole('button', { name: 'Fin aquí ]' }).click();
  await expect(sel).toContainText('0:05.0 – 0:10.0');
  await page.getByRole('button', { name: 'Pasar al tramo siguiente' }).click();
  await expect(sel).toContainText('0:10.0 – 0:15.0');
  expect(await time(page)).toBeCloseTo(10, 0);
  await page.getByRole('button', { name: 'Pasar al tramo siguiente' }).click();
  await expect(sel).toContainText('0:15.0 – 0:20.0');
  await expect(page.getByRole('button', { name: 'Pasar al tramo siguiente' })).toBeDisabled();
  await page.getByRole('button', { name: 'Pasar al tramo anterior' }).click();
  await page.getByRole('button', { name: 'Acortar la selección a la mitad' }).click();
  await expect(sel).toContainText('0:10.0 – 0:12.5');
  await page.getByRole('button', { name: 'Duplicar el largo de la selección' }).click();
  await page.getByRole('button', { name: 'Duplicar el largo de la selección' }).click();
  await expect(sel).toContainText('0:10.0 – 0:20.0');
  // el tramo anterior no se sale del principio
  await page.getByRole('button', { name: 'Pasar al tramo anterior' }).click();
  await expect(sel).toContainText('0:00.0 – 0:10.0');
  await expect(page.getByRole('button', { name: 'Pasar al tramo anterior' })).toBeDisabled();
});

test('un pasaje se guarda con un toque y al otro día el audio se reabre solo con sus pasajes y su selección', async ({ page }) => {
  await openAudio(page, await makeWav({ seconds: 20 }));
  await page.getByRole('button', { name: 'Avanzar 5 segundos' }).click();
  await page.getByRole('button', { name: 'Inicio aquí [' }).click();
  await page.getByRole('button', { name: 'Avanzar 5 segundos' }).click();
  await page.getByRole('button', { name: 'Fin aquí ]' }).click();
  await page.getByRole('button', { name: 'Guardar la selección como pasaje' }).click();
  await expect(page.getByRole('button', { name: /Pasaje guardado: Pasaje 1/ })).toBeVisible();
  // otro tramo, otro pasaje
  await page.getByRole('button', { name: 'Pasar al tramo siguiente' }).click();
  await page.getByRole('button', { name: 'Guardar la selección como pasaje' }).click();
  const chips = page.getByRole('group', { name: 'Pasajes guardados' });
  await expect(chips.getByRole('button')).toHaveText(['Pasaje 1', 'Pasaje 2']);
  await expect(page.getByText('Pasajes guardados (2)')).toBeVisible();
  await page.waitForTimeout(1200); // el guardado espera 0,7 s

  // "al otro día": se recarga la app y se vuelve a Transcribir, sin tocar nada más
  await page.reload();
  await page.waitForSelector('canvas.wave');
  await expect(page.getByText('Motor preciso')).toBeVisible({ timeout: 30_000 });
  await expect(chips.getByRole('button')).toHaveText(['Pasaje 1', 'Pasaje 2']);
  await expect(page.locator('.selection')).toContainText('0:10.0 – 0:15.0');
  await expect(chips.getByRole('button', { name: 'Pasaje 2' })).toHaveAttribute('aria-pressed', 'true');
  // un toque en el otro pasaje lo deja listo para repetir
  await chips.getByRole('button', { name: 'Pasaje 1' }).click();
  await expect(page.locator('.selection')).toContainText('0:05.0 – 0:10.0');
  expect(await time(page)).toBeCloseTo(5, 0);

  // si se cierra el audio a propósito, no se reabre solo
  await page.getByRole('button', { name: 'Cerrar' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Transcribir' })).toBeVisible();
  await page.waitForTimeout(800);
  await expect(page.locator('canvas.wave')).toHaveCount(0);
  await expect(page.locator('.tracklist')).toContainText('2 pasajes');
});
