import { expect, test } from './helpers';

test.describe('copia de seguridad', () => {
  const card = (page: import('@playwright/test').Page) => page.locator('.card', { has: page.getByRole('heading', { name: 'Copia de seguridad' }) });

  test('guardar, borrar y restaurar devuelve los datos; la contraseña no viaja', async ({ page }) => {
    await page.goto('/#/mas');
    await page.evaluate(() => {
      localStorage.setItem('harmonyjazz:library', JSON.stringify({ tunes: [{ id: 'u:1', name: 'Mi tema', composer: '', key: 'C', mode: 'major', chart: 'Dm7 | G7 | Cmaj7 | Cmaj7', tempo: 120, style: 'swing' }] }));
      localStorage.setItem('harmonyjazz:mastery', JSON.stringify({ 'lesson:x': { C: 130 } }));
    });
    await page.reload();
    await expect(card(page)).toBeVisible();
    await expect(card(page).getByText('Todavía no hiciste ninguna copia.')).toBeVisible();
    const [dl] = await Promise.all([page.waitForEvent('download'), card(page).getByRole('button', { name: 'Guardar copia' }).click()]);
    const file = await dl.path();
    const text = (await (await dl.createReadStream()).toArray()).join('');
    expect(text).not.toContain('dccea14e');
    expect(dl.suggestedFilename()).toMatch(/^harmonyjazz-copia-\d{4}-\d{2}-\d{2}\.json$/);
    await page.evaluate(() => {
      localStorage.removeItem('harmonyjazz:library');
      localStorage.removeItem('harmonyjazz:mastery');
    });
    page.on('dialog', (d) => d.accept());
    await card(page).locator('input[type=file]').setInputFiles(file!);
    await expect(page.getByRole('navigation', { name: 'Secciones' })).toBeVisible({ timeout: 10_000 });
    await expect.poll(() => page.evaluate(() => localStorage.getItem('harmonyjazz:mastery'))).toBe('{"lesson:x":{"C":130}}');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:library')!).tunes[0].name)).toBe('Mi tema');
  });

  test('un archivo que no es una copia se rechaza; una copia con datos dañados los descarta y lo dice', async ({ page }) => {
    await page.goto('/#/mas');
    await expect(card(page)).toBeVisible();
    page.on('dialog', (d) => d.accept());
    await card(page).locator('input[type=file]').setInputFiles({ name: 'malo.json', mimeType: 'application/json', buffer: Buffer.from('{"hola":1}') });
    await expect(card(page).getByText('Este archivo no es una copia de HarmonyJazz')).toBeVisible();
    const danada = JSON.stringify({ app: 'harmonyjazz', data: { library: { tunes: 5 }, settings: { volume: 'x', view: 'C' } } });
    await card(page).locator('input[type=file]').setInputFiles({ name: 'danada.json', mimeType: 'application/json', buffer: Buffer.from(danada) });
    await expect(card(page).getByText(/Se ignoraron datos dañados de la copia: library/)).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Secciones' })).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('editor de grilla', () => {
  test('atajos: plantillas, acordes de la tonalidad y transposición reversible', async ({ page }) => {
    await page.goto('/#/repertorio');
    await page.locator('.library > details > summary').click();
    await page.getByText('Atajos: acordes de la tonalidad y plantillas').click();
    await page.getByLabel('Tonalidad de los atajos').selectOption('Bb');
    await page.getByRole('button', { name: 'Blues de jazz (12 compases)' }).click();
    const chords = async () => (await page.locator('.ced-bar:not(.add) .ced-chords').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
    const blues = await chords();
    expect(blues).toHaveLength(12);
    expect(blues.slice(0, 4)).toEqual(['B♭7', 'E♭7', 'B♭7', 'Fm7 B♭7']);
    await page.getByRole('button', { name: 'Subir toda la grilla un semitono' }).click();
    expect((await chords())[0]).toBe('B7');
    await page.getByRole('button', { name: 'Bajar toda la grilla un semitono' }).click();
    expect(await chords()).toEqual(blues);
    await page.locator('.ced-bar:not(.add)').first().click();
    await page.getByLabel('Tonalidad de los atajos').selectOption('C');
    await page.getByRole('group', { name: 'Acordes de la tonalidad' }).getByRole('button').nth(1).click();
    expect((await chords())[0]).toBe('Dm7');
  });
});

test.describe('modo atril', () => {
  test('muestra el compás que suena, cambia el tempo y se cierra; la letra se cambia en Ajustes', async ({ page }) => {
    await page.goto('/#/playalong?p=rhythm');
    await page.waitForSelector('.player');
    await page.getByRole('button', { name: /Modo atril/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Modo atril' });
    await expect(dialog).toBeVisible();
    expect(await dialog.locator('.board .bar').count()).toBeGreaterThanOrEqual(32);
    await dialog.getByRole('button', { name: 'Reproducir' }).click();
    await expect(dialog.locator('.bar.now')).toHaveCount(1, { timeout: 15_000 });
    // arriba no hay un acorde grande ni «sigue»: el que suena y el que sigue se leen en la grilla
    await expect(dialog.locator('.atril-now, .atril-sym, .atril-next')).toHaveCount(0);
    await expect(dialog.getByText(/^sigue/)).toHaveCount(0);
    await expect(dialog.locator('.board .bar.next')).toHaveCount(1);
    const tempo = async () => Number((await dialog.locator('.atril-bar b').innerText()).replace(/\D+/g, ''));
    const t0 = await tempo();
    await dialog.getByRole('button', { name: 'Subir el tempo' }).click();
    expect(await tempo()).toBe(t0 + 4);
    // sólo quedan detener, el tempo con − y + y el modo de memoria (el ojo de «Mirar» aparece si hay algo oculto): no hay botones de tamaño de letra
    await expect(dialog.locator('.atril-bar button')).toHaveCount(4);
    await expect(dialog.getByRole('button', { name: /Modo de memoria/ })).toHaveCount(1);
    await expect(dialog.getByRole('button', { name: /Letra más/ })).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Detener' }).click();
    await dialog.getByRole('button', { name: 'Cerrar el modo atril' }).click();
    await expect(dialog).toHaveCount(0);
  });
});

test.describe('modo atril: el tamaño de la letra está en Ajustes y la pantalla es para la grilla', () => {
  test('el tamaño se cambia en Más → Ajustes y el atril lo usa', async ({ page }) => {
    await page.goto('/#/mas');
    const barra = page.getByLabel('Tamaño de la letra del atril');
    await barra.fill('3');
    await expect(page.getByText('Tamaño de la letra del atril: 3.0')).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:atril')!).size)).toBe(3);
    await page.goto('/#/playalong?p=ii-v-i');
    await page.getByRole('button', { name: /Modo atril/ }).click();
    const fs = await page.locator('.atril .board .bar').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fs).toBeCloseTo(48, 0);
    // y se recuerda al recargar
    await page.goto('/#/mas');
    await page.reload();
    await expect(page.getByLabel('Tamaño de la letra del atril')).toHaveValue('3');
  });

  test('en el celular la grilla ocupa casi toda la pantalla: barra de arriba y de abajo bajas', async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 800 });
    await page.goto('/#/playalong?p=blues-f');
    await page.getByRole('button', { name: /Modo atril/ }).click();
    const m = await page.evaluate(() => {
      const r = (q: string) => document.querySelector(q)!.getBoundingClientRect();
      return { arriba: r('.atril-head').bottom, abajo: window.innerHeight - r('.atril-bar').top, tablero: r('.atril .board').top };
    });
    expect(m.arriba).toBeLessThan(70);
    expect(m.abajo).toBeLessThan(70);
    expect(m.tablero).toBeLessThan(75);
    // el título, la tonalidad y los tiempos siguen arriba, y detener y el tempo abajo
    await expect(page.locator('.atril-top b')).toBeVisible();
    await expect(page.locator('.atril-beats i')).toHaveCount(4);
    const atril = page.getByRole('dialog', { name: 'Modo atril' });
    await expect(atril.getByRole('button', { name: 'Reproducir' })).toBeVisible();
    await expect(atril.getByRole('button', { name: 'Bajar el tempo' })).toBeVisible();
    await expect(atril.getByRole('button', { name: 'Subir el tempo' })).toBeVisible();
  });
});

test('atril: un título larguísimo no parte la barra de arriba en dos renglones, ni en pantallas angostas', async ({ page }) => {
  // el nombre más largo que admite un tema (80 caracteres)
  const nombre = 'Un tema con un nombre larguísimo que no entra en una sola línea del celular'.padEnd(80, '!');
  await page.addInitScript((n) => {
    if (!localStorage.getItem('harmonyjazz:library')) localStorage.setItem('harmonyjazz:library', JSON.stringify({ tunes: [{ id: 'u:largo', name: n, composer: '', key: 'C', mode: 'major', chart: 'Dm7 | G7 | Cmaj7 | Cmaj7', tempo: 120, style: 'swing' }] }));
  }, nombre);
  for (const ancho of [320, 360, 412]) {
    await page.setViewportSize({ width: ancho, height: 760 });
    await page.goto('/#/playalong?p=u:largo');
    await page.getByRole('button', { name: /Modo atril/ }).click();
    const m = await page.evaluate(() => {
      const top = document.querySelector('.atril-top')!.getBoundingClientRect();
      const t = document.querySelector('.atril-top > b') as HTMLElement;
      return { alto: top.height, cortado: t.scrollWidth > t.clientWidth, cierre: document.querySelector('.atril-top button')!.getBoundingClientRect().right <= window.innerWidth + 1 };
    });
    expect(m.alto, `${ancho} px`).toBeLessThan(60);
    expect(m.cortado, `${ancho} px`).toBe(true);
    expect(m.cierre, `${ancho} px: el botón Cerrar queda a la vista`).toBe(true);
    await page.getByRole('button', { name: 'Cerrar el modo atril' }).click();
  }
});

test.describe('formas de práctica', () => {
  test('la app no trae temas con nombre propio y un enlace viejo no rompe nada', async ({ page }) => {
    await page.goto('/#/repertorio');
    await page.waitForSelector('.player');
    const names = await page.locator('select[aria-label="Tema"] option').allInnerTexts();
    expect(names.join(' | ')).not.toMatch(/Autumn|Bossa|Solar|Giant|Monk|Parker|Freeloader|Billie|All of Me|Ipanema|Stella/);
    await page.goto('/#/playalong?p=autumn');
    await expect(page.locator('select[aria-label="Tema"]')).toHaveValue('ii-v-i');
  });
});
