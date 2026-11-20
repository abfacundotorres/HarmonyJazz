import { expect, test } from './helpers';

const TEMA = { id: 'u:hoja', name: 'Hojas de otoño', composer: '', key: 'G', mode: 'minor', chart: 'Cm7 | F7 | Bbmaj7 | Ebmaj7', tempo: 120, style: 'swing' };
const conTema = (page: import('@playwright/test').Page) => page.addInitScript((t) => localStorage.setItem('harmonyjazz:library', JSON.stringify({ tunes: [t] })), TEMA);
const guardado = (page: import('@playwright/test').Page) => page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:repertorio') ?? 'null'));

test.describe('mi repertorio', () => {
  test('sin temas explica cómo cargar uno', async ({ page }) => {
    await page.goto('/#/repertorio');
    await expect(page.getByRole('heading', { name: 'Mi repertorio' })).toBeVisible();
    await expect(page.getByText(/Todavía no cargaste ningún tema/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ir a Play-along' })).toBeVisible();
    // Repertorio está en el grupo Tocar
    await expect(page.getByRole('navigation', { name: 'Pantallas de Tocar' }).getByRole('link', { name: 'Repertorio' })).toHaveAttribute('aria-current', 'page');
  });

  test('cada tema propio tiene sus siete pasos: se tildan, avanzan el progreso y se recuerdan', async ({ page }) => {
    await conTema(page);
    await page.goto('/#/repertorio');
    const tema = page.getByRole('region', { name: 'Hojas de otoño' });
    await expect(tema.locator('ol.pasos li')).toHaveCount(7);
    await expect(tema).toContainText('0 de 7 pasos');
    await expect(tema).toContainText('todavía no lo tocaste');
    await expect(tema).toContainText('sigue: La forma');
    await tema.getByLabel('Hojas de otoño: La forma').check();
    await tema.getByLabel('Hojas de otoño: Guide tones').check();
    await expect(tema).toContainText('2 de 7 pasos');
    await expect(tema).toContainText('lo tocaste hoy');
    await expect(tema).toContainText('sigue: Fundamentales');
    expect((await guardado(page))['u:hoja'].hechos).toEqual([0, 2]);
    await page.reload();
    await expect(page.getByRole('region', { name: 'Hojas de otoño' })).toContainText('2 de 7 pasos');
    // destildar
    await page.getByLabel('Hojas de otoño: Guide tones').uncheck();
    await expect(page.getByRole('region', { name: 'Hojas de otoño' })).toContainText('1 de 7 pasos');
    // el enlace abre el tema en el play-along
    await page.getByRole('link', { name: 'Abrir en el play-along' }).click();
    await expect(page).toHaveURL(/#\/playalong\?p=u%3Ahoja/);
  });

  test('completar los siete pasos lo marca completo y «Lo toqué hoy» anota el día', async ({ page }) => {
    await conTema(page);
    await page.goto('/#/repertorio');
    const tema = page.getByRole('region', { name: 'Hojas de otoño' });
    await expect(tema.locator('ol.pasos input')).toHaveCount(7);
    for (const c of await tema.locator('ol.pasos input').all()) await c.check();
    await expect(tema).toContainText('7 de 7 pasos');
    await expect(tema).toContainText('¡completo!');
    await tema.getByRole('button', { name: 'Lo toqué hoy' }).click();
    await expect(tema).toContainText('lo tocaste hoy');
  });

  test('el tema del mes de la currícula, si es una forma incluida, aparece primero', async ({ page }) => {
    await page.goto('/#/mes');
    await page.getByRole('button', { name: 'Empezar el mes con estos focos' }).click();
    await page.goto('/#/repertorio');
    const tema = page.locator('section.tema').first();
    await expect(tema).toContainText('Tema del mes');
    await expect(tema).toContainText('ii–V–I mayor');
  });

  test('hace una semana o más que no lo tocás: aparece en Para repasar de Hoy y de Progreso', async ({ page }) => {
    await conTema(page);
    await page.addInitScript(() => {
      const hoy = Math.floor(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) / 86400000);
      localStorage.setItem('harmonyjazz:repertorio', JSON.stringify({ 'u:hoja': { hechos: [0, 1], ultimo: hoy - 9, inicio: hoy - 20 } }));
    });
    await page.goto('/#/hoy');
    const repaso = page.locator('#repaso');
    await expect(repaso).toContainText('Repertorio · Hojas de otoño');
    await expect(repaso).toContainText('Hace 9 días que no lo tocás');
    await expect(repaso).toContainText('sigue: Guide tones');
    await repaso.getByRole('link', { name: /Repertorio · Hojas de otoño/ }).click();
    await expect(page).toHaveURL(/#\/repertorio$/);
    await page.goto('/#/progreso');
    await expect(page.locator('#repaso')).toContainText('Hace 9 días que no lo tocás');
  });

  test('tocado hace poco no aparece en el repaso', async ({ page }) => {
    await conTema(page);
    await page.addInitScript(() => {
      const hoy = Math.floor(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) / 86400000);
      localStorage.setItem('harmonyjazz:repertorio', JSON.stringify({ 'u:hoja': { hechos: [0], ultimo: hoy - 3, inicio: hoy - 5 } }));
    });
    await page.goto('/#/hoy');
    await expect(page.locator('.hero')).toBeVisible();
    await expect(page.locator('#repaso')).toHaveCount(0);
  });

  test('datos dañados no rompen la pantalla y no se desborda en el celular', async ({ page }) => {
    await conTema(page);
    await page.addInitScript(() => localStorage.setItem('harmonyjazz:repertorio', JSON.stringify({ 'u:hoja': { hechos: [1, 'x', 99], ultimo: 'no' }, basura: 5 })));
    await page.goto('/#/repertorio');
    await expect(page.getByRole('region', { name: 'Hojas de otoño' })).toContainText('1 de 7 pasos');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
