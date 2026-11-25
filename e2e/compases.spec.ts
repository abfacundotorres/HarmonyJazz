import { expect, test, sinAtrilAutomatico } from './helpers';

// estas pruebas usan el reproductor del Play-along: que dar play no abra el atril encima
test.beforeEach(async ({ page }) => {
  await sinAtrilAutomatico(page);
});

const style = (page: import('@playwright/test').Page) => page.getByLabel('Estilo', { exact: true }).first();

test('vals en 3/4: estilos propios del compás, cuenta de 3, metrónomo en 2 y 3, atril con 3 tiempos y el compás que suena avanza', async ({ page }) => {
  await page.goto('/#/playalong?p=vals-ii-v-i');
  await expect(page.getByLabel('Tema', { exact: true })).toHaveValue('vals-ii-v-i');
  await expect(page.locator('.board .bar')).toHaveCount(8);
  // sólo swing y balada (los otros estilos son de 4/4)
  await expect(style(page).locator('option')).toHaveText(['Swing (walking)', 'Balada']);
  await expect(page.locator('.player-note', { hasText: 'Compás de 3/4: el tempo marca la negra' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sólo 2 y 3' })).toBeVisible();
  await page.locator('.player summary', { hasText: 'Más' }).click();
  await expect(page.getByLabel('Cuenta de 3')).toBeChecked();
  await page.getByLabel('Cuenta de 3').uncheck();
  await page.getByRole('button', { name: 'Reproducir' }).click();
  await expect(page.getByRole('button', { name: 'Detener' })).toBeVisible();
  // a 150 bpm un compás dura 1,2 s: el resaltado pasa del compás 1 a otro
  await expect(page.locator('.board .bar.now')).toHaveCount(1, { timeout: 10_000 });
  const first = await page.locator('.board .bar.now .barno').innerText();
  await expect.poll(async () => (await page.locator('.board .bar.now .barno').allInnerTexts()).join(), { timeout: 10_000 }).not.toBe(first);
  await page.getByRole('button', { name: 'Detener' }).click();
  // atril: tres tiempos
  await page.getByRole('button', { name: /Modo atril/ }).click();
  await expect(page.locator('.atril-beats i')).toHaveCount(3);
  await page.getByRole('button', { name: 'Cerrar el modo atril' }).click();
});

test('6/8: dos pulsos, el tempo marca la negra con puntillo y suena sin errores', async ({ page }) => {
  await page.goto('/#/playalong?p=seis-octavos');
  await expect(page.locator('.board .bar')).toHaveCount(8);
  await expect(page.locator('.player-note', { hasText: 'Compás de 6/8: el tempo marca la negra con puntillo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sólo el 2.º pulso' })).toBeVisible();
  await page.locator('.player summary', { hasText: 'Más' }).click();
  await expect(page.getByLabel('Cuenta de 2')).toBeChecked();
  await page.getByRole('button', { name: 'Reproducir' }).click();
  await expect(page.getByRole('button', { name: 'Detener' })).toBeVisible();
  await expect(page.locator('.board .bar.now')).toHaveCount(1, { timeout: 10_000 });
  await page.waitForTimeout(2500);
  await expect(page.getByRole('button', { name: 'Detener' })).toBeVisible();
  await page.getByRole('button', { name: 'Detener' }).click();
  await page.getByRole('button', { name: /Modo atril/ }).click();
  await expect(page.locator('.atril-beats i')).toHaveCount(2);
});

test('una progresión de 4/4 no cambia: cuatro tiempos, todos los estilos y "Sólo 2 y 4"', async ({ page }) => {
  await page.goto('/#/playalong?p=ii-v-i');
  await expect(style(page).locator('option')).toHaveCount(5);
  await expect(page.getByRole('button', { name: 'Sólo 2 y 4' })).toBeVisible();
  await expect(page.locator('.player-note', { hasText: /Compás de [36]\/[48]/ })).toHaveCount(0);
  await page.getByRole('button', { name: /Modo atril/ }).click();
  await expect(page.locator('.atril-beats i')).toHaveCount(4);
});

test('el editor arma temas en 3/4: límite de acordes, aviso al volver a 4/4 y se guarda y se reabre en 3/4', async ({ page }) => {
  await page.goto('/#/repertorio');
  await page.locator('.library > details > summary').click();
  const meter = page.getByLabel('Tipo de compás');
  await expect(meter).toHaveValue('4/4');
  const add = page.getByRole('button', { name: 'Agregar acorde al compás' });
  // en 4/4 entran 4 acordes
  await page.getByLabel('Acorde 1 del compás 1').fill('Dm7');
  for (let i = 0; i < 3; i++) await add.click();
  await expect(add).toBeDisabled();
  await page.getByLabel('Acorde 2 del compás 1').fill('G7');
  await page.getByLabel('Acorde 3 del compás 1').fill('C7');
  await page.getByLabel('Acorde 4 del compás 1').fill('Fmaj7');
  // pasar a 3/4 quita el 4.º acorde y avisa; se puede deshacer
  await meter.selectOption('3/4');
  await expect(page.getByText(/Se quitó 1 acorde que no entra en 3\/4/)).toBeVisible();
  await expect(page.getByLabel('Acorde 4 del compás 1')).toHaveCount(0);
  await expect(add).toBeDisabled();
  await page.getByRole('button', { name: /Deshacer/ }).click();
  await expect(meter).toHaveValue('4/4');
  await expect(page.getByLabel('Acorde 4 del compás 1')).toHaveValue('Fmaj7');
  await meter.selectOption('3/4');
  // se escucha desde el editor (compás de seis corcheas)
  await page.getByRole('button', { name: 'Escuchar la grilla' }).click();
  await expect(page.getByRole('button', { name: 'Detener' }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Detener' }).first().click();
  // guardar y comprobar lo guardado
  await page.getByPlaceholder('Ej.: Mi tema').fill('Mi vals');
  await page.getByRole('button', { name: 'Guardar tema' }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:library')!).tunes[0]);
  expect(saved.chart).toBe('@3/4 Dm7 G7 C7');
  expect(saved.doc.meter).toBe('3/4');
  // al editarlo de nuevo, vuelve en 3/4
  await page.reload();
  await page.locator('.library > details > summary').click();
  await page.getByRole('button', { name: 'Editar' }).click();
  await expect(page.getByLabel('Tipo de compás')).toHaveValue('3/4');
  // y toca en el play-along con su compás
  await page.getByRole('button', { name: 'Tocar' }).click();
  await expect(page.locator('.player-note', { hasText: 'Compás de 3/4: el tempo marca la negra' })).toBeVisible();
});

test('la carga de texto acepta "compás: 3/4"', async ({ page }) => {
  await page.goto('/#/repertorio');
  await page.locator('.library > details > summary').click();
  await page.getByText('Carga masiva: muchos temas de una vez').click();
  await page.getByLabel('Texto con varios temas').fill('# Vals de prueba\ncompás: 3/4\nDm7 | G7 | Cmaj7 | Cmaj7');
  await page.getByRole('button', { name: 'Revisar' }).click();
  await page.getByRole('button', { name: /^Importar 1 tema/ }).click();
  const t = await page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:library')!).tunes[0]);
  expect(t.chart).toBe('@3/4 Dm7 | G7 | Cmaj7 | Cmaj7');
});

test('la carga de texto trae la melodía y pasa de Si♭ a concierto con "lectura: Bb"', async ({ page }) => {
  await page.goto('/#/repertorio');
  await page.locator('.library > details > summary').click();
  await page.getByText('Carga masiva: muchos temas de una vez').click();
  await page.getByText('Ver un ejemplo').click();
  await page.getByRole('button', { name: 'Usar este ejemplo' }).click();
  await expect(page.locator('.bulklist li.ok')).toHaveCount(3);
  await expect(page.locator('.bulklist')).toContainText('Melodía: 6 de 8 compases');
  await expect(page.locator('.bulklist')).toContainText('Cifrado pasado de Si♭ a concierto');
  await page.getByRole('button', { name: /^Importar 3 temas/ }).click();
  const tunes = await page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:library')!).tunes);
  const a = tunes.find((t: { name: string }) => t.name === 'Mi tema de ejemplo');
  const b = tunes.find((t: { name: string }) => t.name.startsWith('Otro, copiado'));
  expect(a.melody).toBe('F4:2 A4:2 G4:4 E4:8 r:8 C4 E4 A4 G4 F4:4 D4:4 r:8');
  expect(b.chart).toBe('Dm7 | G7 | Cmaj7 | Cmaj7');
  expect(b).toMatchObject({ key: 'C', mode: 'major' });
});
