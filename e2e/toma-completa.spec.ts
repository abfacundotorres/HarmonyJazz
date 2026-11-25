import { abrirPasos, expect, sinAtrilAutomatico, test } from './helpers';

// Toma completa del tema: micrófono + acompañamiento con cuenta previa durante N coros (melodía, solo, melodía), que se
// detiene sola y deja «Tu toma». El navegador de prueba usa un micrófono falso.
const TEMA = { id: 'u:toma', name: 'Tema de toma', composer: '', key: 'C', mode: 'major', chart: 'Dm7 | G7 | Cmaj7 | Cmaj7', tempo: 120, style: 'swing' };
const conTema = (page: import('@playwright/test').Page) =>
  page.addInitScript((t) => localStorage.setItem('harmonyjazz:library', JSON.stringify({ tunes: [t] })), TEMA);
const abrir = async (page: import('@playwright/test').Page, extra = '') => {
  await page.goto(`/#/playalong?p=u%3Atoma${extra}`);
  await page.waitForSelector('.player');
};
/** Sube el tempo al máximo para que la prueba dure unos segundos. */
const rapido = (page: import('@playwright/test').Page) => page.locator('.player input[type="range"]').first().fill('320');

test.describe('toma completa', () => {
  // la tarjeta de la toma está en el Play-along: que dar play no abra el atril encima (el atril con la toma se prueba aparte)
  test.beforeEach(async ({ page }) => {
    await sinAtrilAutomatico(page);
  });

  test('desde Mi repertorio, el paso «Grabado completo» lleva a la toma con la tarjeta abierta', async ({ page }) => {
    await conTema(page);
    await page.goto('/#/repertorio');
    await abrirPasos(page);
    const tema = page.getByRole('region', { name: 'Tema de toma' });
    await tema.getByRole('link', { name: /Grabar una toma completa/ }).click();
    await expect(page).toHaveURL(/#\/playalong\?p=u%3Atoma&toma=1/);
    await expect(page.locator('details.toma')).toHaveAttribute('open', '');
    await expect(page.getByRole('button', { name: /Empezar la toma/ })).toBeVisible();
  });

  test('la tarjeta dice el guion y la duración, y ofrece de 3 a 6 coros', async ({ page }) => {
    await conTema(page);
    await abrir(page);
    await page.getByText('Grabar una toma completa').click();
    const toma = page.locator('details.toma');
    await expect(toma).toContainText('tocá la melodía → improvisá → tocá la melodía');
    await expect(toma.getByLabel('Cantidad de coros de la toma').locator('option')).toHaveText(['3 (melodía, solo, melodía)', '4', '5', '6']);
    await toma.getByLabel('Cantidad de coros de la toma').selectOption('5');
    await expect(toma).toContainText('tocá la melodía → improvisá → improvisá → improvisá → tocá la melodía');
  });

  test('empieza sola, dice qué tocar en cada coro, se detiene al terminar y deja «Tu toma» para marcar el paso', async ({ page }) => {
    test.setTimeout(90_000);
    await conTema(page);
    await abrir(page);
    await rapido(page);
    await page.getByText('Grabar una toma completa').click();
    await page.getByRole('button', { name: /Empezar la toma/ }).click();
    const consigna = page.locator('.tomaconsigna');
    await expect(consigna).toContainText(/Cuenta previa|Coro 1 de 3/, { timeout: 15_000 });
    await expect(consigna).toContainText('Coro 1 de 3: Tocá la melodía', { timeout: 15_000 });
    await expect(consigna).toContainText('Coro 2 de 3: Improvisá', { timeout: 15_000 });
    await expect(consigna).toContainText('Coro 3 de 3: Tocá la melodía', { timeout: 15_000 });
    // se detiene solo: vuelve el botón de empezar y aparece la toma con su audio
    await expect(page.getByRole('button', { name: /Empezar la toma/ })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Tu toma' })).toBeVisible({ timeout: 30_000 });
    const audio = page.locator('section audio');
    await expect(audio).toBeVisible({ timeout: 15_000 });
    const dur = await audio.evaluate(async (a: HTMLAudioElement) => {
      if (a.readyState < 1) await new Promise((r) => a.addEventListener('loadedmetadata', r, { once: true }));
      return a.duration;
    });
    // 3 coros de 4 compases a 320 bpm son ~9 s, más la cuenta previa y lo que tarda en detenerse
    expect(dur).toBeGreaterThan(8);
    expect(dur).toBeLessThan(25);
    // el reproductor quedó detenido
    await expect(page.getByRole('button', { name: 'Reproducir' })).toBeVisible();
    // marcar el paso en Mi repertorio
    await page.getByRole('button', { name: /Marcar «Grabado completo»/ }).click();
    await expect(page.getByText(/«Grabado completo» marcado/)).toBeVisible();
    const rep = await page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:repertorio')!));
    expect(rep['u:toma'].hechos).toContain(6);
    // la toma anota con qué tempo y en qué tonalidad salió (se tocó a 320 bpm en el Do de concierto del tema)
    expect(rep['u:toma'].detalle[6]).toEqual({ bpm: 320, keys: ['C'] });
    await expect(page.getByText(/\(320 bpm\)/).first()).toBeVisible();
  });

  test('cortarla a mitad deja lo grabado hasta ahí y no queda nada sonando', async ({ page }) => {
    test.setTimeout(60_000);
    await conTema(page);
    await abrir(page);
    await rapido(page);
    await page.getByText('Grabar una toma completa').click();
    await page.getByRole('button', { name: /Empezar la toma/ }).click();
    await expect(page.locator('.tomaconsigna')).toContainText('Coro 1 de 3', { timeout: 15_000 });
    await page.getByRole('button', { name: /Cortar la toma/ }).click();
    await expect(page.getByRole('button', { name: /Empezar la toma/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reproducir' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tu toma' })).toBeVisible({ timeout: 30_000 });
  });

  test('el botón de detener del reproductor también cierra la toma', async ({ page }) => {
    test.setTimeout(60_000);
    await conTema(page);
    await abrir(page);
    await rapido(page);
    await page.getByText('Grabar una toma completa').click();
    await page.getByRole('button', { name: /Empezar la toma/ }).click();
    await expect(page.locator('.tomaconsigna')).toContainText('Coro 1 de 3', { timeout: 15_000 });
    await page.getByRole('button', { name: 'Detener' }).click();
    await expect(page.getByRole('button', { name: /Empezar la toma/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tu toma' })).toBeVisible({ timeout: 30_000 });
  });

  test('una progresión que no está en el repertorio no ofrece marcar el paso', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/#/playalong?p=ii-v-i');
    await page.waitForSelector('.player');
    await rapido(page);
    await page.getByText('Grabar una toma completa').click();
    await page.getByRole('button', { name: /Empezar la toma/ }).click();
    await expect(page.locator('.tomaconsigna')).toContainText('Coro 1 de 3', { timeout: 15_000 });
    await page.getByRole('button', { name: /Cortar la toma/ }).click();
    await expect(page.getByRole('heading', { name: 'Tu toma' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: /Marcar «Grabado completo»/ })).toHaveCount(0);
  });
});
