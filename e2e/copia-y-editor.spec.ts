import { expect, test } from './helpers';

test.describe('copia de seguridad', () => {
  const card = (page: import('@playwright/test').Page) => page.locator('.card', { has: page.getByRole('heading', { name: 'Copia de seguridad' }) });

  test('guardar, borrar y restaurar devuelve los datos; la contraseña no viaja', async ({ page }) => {
    await page.goto('/#/hoy');
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
    await expect(page.locator('nav')).toBeVisible({ timeout: 10_000 });
    await expect.poll(() => page.evaluate(() => localStorage.getItem('harmonyjazz:mastery'))).toBe('{"lesson:x":{"C":130}}');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:library')!).tunes[0].name)).toBe('Mi tema');
  });

  test('un archivo que no es una copia se rechaza; una copia con datos dañados los descarta y lo dice', async ({ page }) => {
    await page.goto('/#/hoy');
    await expect(card(page)).toBeVisible();
    page.on('dialog', (d) => d.accept());
    await card(page).locator('input[type=file]').setInputFiles({ name: 'malo.json', mimeType: 'application/json', buffer: Buffer.from('{"hola":1}') });
    await expect(card(page).getByText('Este archivo no es una copia de HarmonyJazz')).toBeVisible();
    const danada = JSON.stringify({ app: 'harmonyjazz', data: { library: { tunes: 5 }, settings: { volume: 'x', view: 'C' } } });
    await card(page).locator('input[type=file]').setInputFiles({ name: 'danada.json', mimeType: 'application/json', buffer: Buffer.from(danada) });
    await expect(card(page).getByText(/Se ignoraron datos dañados de la copia: library/)).toBeVisible();
    await expect(page.locator('nav')).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('editor de grilla', () => {
  test('atajos: plantillas, acordes de la tonalidad y transposición reversible', async ({ page }) => {
    await page.goto('/#/playalong');
    await page.getByText(/Mis temas/).first().click();
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
  test('muestra el acorde y el compás que suenan, cambia el tempo y la letra, y se cierra', async ({ page }) => {
    await page.goto('/#/playalong?p=rhythm');
    await page.waitForSelector('.player');
    await page.getByRole('button', { name: /Modo atril/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Modo atril' });
    await expect(dialog).toBeVisible();
    expect(await dialog.locator('.board .bar').count()).toBeGreaterThanOrEqual(32);
    await dialog.getByRole('button', { name: 'Reproducir' }).click();
    await expect(dialog.locator('.bar.now')).toHaveCount(1, { timeout: 15_000 });
    await expect(dialog.locator('.atril-sym')).not.toHaveText('—');
    const tempo = async () => Number((await dialog.locator('.atril-bar b').innerText()).replace(/\D+/g, ''));
    const t0 = await tempo();
    await dialog.getByRole('button', { name: 'Subir el tempo' }).click();
    expect(await tempo()).toBe(t0 + 4);
    const fs = () => dialog.locator('.board .bar').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    const f0 = await fs();
    await dialog.getByRole('button', { name: 'Letra más grande' }).click();
    expect(await fs()).toBeGreaterThan(f0);
    await dialog.getByRole('button', { name: 'Detener' }).click();
    await dialog.getByRole('button', { name: 'Cerrar el modo atril' }).click();
    await expect(dialog).toHaveCount(0);
  });
});

test.describe('formas de práctica', () => {
  test('la app no trae temas con nombre propio y un enlace viejo no rompe nada', async ({ page }) => {
    await page.goto('/#/playalong');
    await page.waitForSelector('.player');
    const names = await page.locator('select[aria-label="Tema"] option').allInnerTexts();
    expect(names.join(' | ')).not.toMatch(/Autumn|Bossa|Solar|Giant|Monk|Parker|Freeloader|Billie|All of Me|Ipanema|Stella/);
    await page.goto('/#/playalong?p=autumn');
    await expect(page.locator('select[aria-label="Tema"]')).toHaveValue('ii-v-i');
  });
});
