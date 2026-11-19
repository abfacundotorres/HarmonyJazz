import { expect, test } from './helpers';

const caminos = (page: import('@playwright/test').Page) => page.locator('details.info', { hasText: 'Ver el camino completo' });

test.describe('camino sugerido', () => {
  test('sin nada trabajado sugiere la base y deja elegirla con un botón', async ({ page }) => {
    await page.goto('/#/mes');
    await expect(page.locator('.notice', { hasText: 'Camino sugerido' })).toContainText('Técnica: Nota larga y articulación');
    await expect(page.locator('.notice', { hasText: 'Camino sugerido' })).toContainText('Lenguaje: Tríadas mayores');
    // ya viene elegido lo sugerido
    await expect(page.locator('#f-t-largas-artic')).toBeChecked();
    await expect(page.locator('#f-l-triadas-mayores')).toBeChecked();
    // elegir otro y volver a lo sugerido
    await page.locator('#f-l-escalas-bebop').check();
    await page.getByRole('button', { name: 'Usar lo sugerido' }).click();
    await expect(page.locator('#f-l-triadas-mayores')).toBeChecked();
  });

  test('un foco sin su base avisa qué conviene tener antes', async ({ page }) => {
    await page.goto('/#/mes');
    const bebop = page.locator('.focuscard', { has: page.locator('#f-l-escalas-bebop') });
    await expect(bebop).toContainText('Etapa 4');
    await expect(bebop).toContainText('antes conviene:');
    await expect(bebop).toContainText('La escala de cada acorde');
    // las tríadas mayores son la base: no piden nada
    await expect(page.locator('.focuscard', { has: page.locator('#f-l-triadas-mayores') })).not.toContainText('antes conviene');
  });

  test('el camino completo agrupa por etapas y tildar un foco lo da por trabajado y cambia lo sugerido', async ({ page }) => {
    await page.goto('/#/mes');
    await caminos(page).locator('summary').click();
    await expect(caminos(page).getByRole('heading', { name: 'Etapa 1: Base' })).toBeVisible();
    await expect(caminos(page).getByRole('heading', { name: 'Etapa 6: Avanzado' })).toBeVisible();
    await caminos(page).getByLabel('Ya trabajé: Tríadas mayores', { exact: true }).check();
    await expect(page.locator('.notice', { hasText: 'Camino sugerido' })).toContainText('Lenguaje: Swing y articulación jazzística');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:camino')!))).toEqual({ done: ['l-triadas-mayores'] });
    // el foco trabajado se marca en su tarjeta y se puede destildar
    await expect(page.locator('.focuscard', { has: page.locator('#f-l-triadas-mayores') })).toContainText('Ya trabajado');
    await caminos(page).getByLabel('Ya trabajé: Tríadas mayores', { exact: true }).uncheck();
    await expect(page.locator('.notice', { hasText: 'Camino sugerido' })).toContainText('Lenguaje: Tríadas mayores');
  });

  test('al empezar un mes nuevo con focos del anterior trabajados ocho sesiones o más, quedan como trabajados', async ({ page }) => {
    await page.addInitScript(() => {
      const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const hoy = new Date();
      const dia = (d: Date) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
      const comienzo = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      const log: Record<string, unknown> = {};
      for (let i = 0; i < 10; i++) log[iso(new Date(comienzo.getFullYear(), comienzo.getMonth(), 1 + i))] = { done: ['hoy'], minutes: 0 };
      const mesAnt = `${comienzo.getFullYear()}-${String(comienzo.getMonth() + 1).padStart(2, '0')}`;
      localStorage.setItem('harmonyjazz:month', JSON.stringify({ month: mesAnt, tech: 't-largas-artic', lang: 'l-triadas-mayores', rep: 'ii-v-i', startDay: dia(comienzo) }));
      localStorage.setItem('harmonyjazz:log', JSON.stringify(log));
    });
    await page.goto('/#/mes');
    await page.getByRole('button', { name: 'Empezar el mes con estos focos' }).click();
    await expect(page).toHaveURL(/#\/hoy$/);
    const camino = await page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:camino')!));
    expect(camino.done.sort()).toEqual(['l-triadas-mayores', 't-largas-artic']);
  });

  test('un mes cambiado a los pocos días no cuenta como trabajado', async ({ page }) => {
    await page.goto('/#/mes');
    await page.getByRole('button', { name: 'Empezar el mes con estos focos' }).click();
    await page.goto('/#/mes');
    await page.getByRole('button', { name: 'Cambiar los focos' }).click();
    await page.locator('#f-t-flexibilidad').check();
    await page.getByRole('button', { name: 'Empezar el mes con estos focos' }).click();
    expect(await page.evaluate(() => localStorage.getItem('harmonyjazz:camino'))).toBeNull();
  });

  test('en el celular no se desborda con el camino abierto', async ({ page }) => {
    await page.goto('/#/mes');
    await caminos(page).locator('summary').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
