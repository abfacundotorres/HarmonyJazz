import { abrirFocos, expect, test } from './helpers';

const guardado = (page: import('@playwright/test').Page) => page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:curricula') ?? 'null'));

test.describe('currícula de tres años', () => {
  test('muestra seis semestres de seis materias y la que te toca', async ({ page }) => {
    await page.goto('/#/curricula');
    await expect(page.getByRole('heading', { name: 'Currícula de tres años' })).toBeVisible();
    await expect(page.getByText('0 de 36')).toBeVisible();
    await expect(page.getByText(/Te toca: mes 1, Tríadas mayores/)).toBeVisible();
    await expect(page.locator('details.semester')).toHaveCount(6);
    // sólo el primer semestre viene abierto, con sus seis meses
    await expect(page.locator('details.semester[open]')).toHaveCount(1);
    await expect(page.locator('details.semester').first().locator('li.materia')).toHaveCount(6);
    await expect(page.locator('li.materia')).toHaveCount(36);
  });

  test('el cierre pide tildar todos los criterios para aprobar; al aprobar pasa a la siguiente y lo da por trabajado en el camino', async ({ page }) => {
    await page.goto('/#/curricula');
    const m1 = page.locator('li.materia').first();
    await m1.locator('summary').click();
    const aprobar = m1.getByRole('button', { name: 'Aprobar la materia' });
    await expect(aprobar).toBeDisabled();
    const crit = m1.locator('fieldset.cierre input[type=checkbox]');
    const n = await crit.count();
    expect(n).toBeGreaterThanOrEqual(4);
    for (let i = 0; i < n - 1; i++) await crit.nth(i).check();
    await expect(aprobar).toBeDisabled();
    await crit.nth(n - 1).check();
    await expect(aprobar).toBeEnabled();
    await aprobar.click();
    await expect(page.getByText('1 de 36')).toBeVisible();
    await expect(page.getByText(/Te toca: mes 2, Swing y articulación/)).toBeVisible();
    expect((await guardado(page)).aprobadas).toEqual([1]);
    const camino = await page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:camino')!));
    expect(camino.done).toEqual(expect.arrayContaining(['l-triadas-mayores', 't-largas-artic']));
    // y se puede volver a cursar (la materia sigue abierta)
    await m1.getByRole('button', { name: 'Volver a cursarla' }).click();
    await expect(page.getByText('0 de 36')).toBeVisible();
  });

  test('"Ya la domino" saltea la materia sin pedir el cierre', async ({ page }) => {
    await page.goto('/#/curricula');
    const m1 = page.locator('li.materia').first();
    await m1.locator('summary').click();
    await m1.getByRole('button', { name: 'Ya la domino (saltear)' }).click();
    await expect(page.getByText(/Te toca: mes 2/)).toBeVisible();
  });

  test('"Empezar este mes" arma Mi mes con sus focos y lo deja en curso', async ({ page }) => {
    await page.goto('/#/curricula');
    const m3 = page.locator('li.materia').nth(2);
    await m3.locator('summary').click();
    await expect(m3).toContainText('Correlativas: Tríadas mayores');
    await m3.getByRole('button', { name: 'Empezar este mes' }).click();
    await expect(page).toHaveURL(/#\/hoy$/);
    const mes = await page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:month')!));
    expect(mes).toMatchObject({ lang: 'l-triadas-menores', tech: 't-boquilla-buzzing', rep: 'ii-v-i-minor', nivel: 1 });
    expect((await guardado(page)).actual).toBe(3);
    await expect(page.locator('article.block .bhead').nth(1)).toContainText('Técnica: Boquilla y buzzing');
    // el tema del mes es la forma sugerida y su recorrido es el del primer semestre
    const rep = page.locator('article.block', { hasText: 'Repertorio:' });
    await rep.locator('.bhead').click();
    await expect(rep).toContainText('La forma en el papel');
  });

  test('cada materia sugiere un tema y ejemplos de standards para cargar en Mis temas', async ({ page }) => {
    await page.goto('/#/curricula');
    const m1 = page.locator('li.materia').first();
    await m1.locator('summary').click();
    await expect(m1).toContainText('Tema sugerido:');
    await expect(m1).toContainText('Temas → Mis temas');
    await expect(m1).toContainText('Now’s the Time');
    await page.locator('details.semester').nth(5).locator(':scope > summary').click();
    await expect(page.locator('li.materia').nth(30)).toContainText('Modal');
  });

  test('las formas nuevas están en Play-along', async ({ page }) => {
    await page.goto('/#/playalong?p=aaba-subdominante');
    await expect(page.getByLabel('Tema', { exact: true }).locator('option:checked')).toContainText('AABA con puente en la subdominante');
    for (const id of ['menor-aaba', 'bossa-mayor', 'blues-bb-rapido', 'ii-v-semitonos']) {
      await page.goto(`/#/playalong?p=${id}`);
      await expect(page.getByLabel('Tema', { exact: true })).toHaveValue(id);
    }
  });

  test('Mi mes ya trae elegida la materia que toca y avisa de la currícula', async ({ page }) => {
    await page.goto('/#/mes');
    const aviso = page.locator('.notice', { hasText: 'Currícula · mes 1' });
    await expect(aviso).toContainText('Tríadas mayores');
    await expect(aviso).toContainText('Tema sugerido:');
    await expect(aviso).toContainText('Now’s the Time');
    await abrirFocos(page);
    await expect(page.locator('#f-l-triadas-mayores')).toBeChecked();
    // con la primera aprobada, ofrece la segunda
    await page.addInitScript(() => localStorage.setItem('harmonyjazz:curricula', JSON.stringify({ aprobadas: [1], actual: null, checks: {} })));
    await page.goto('/#/mes');
    await page.reload();
    await expect(page.locator('.notice', { hasText: 'Currícula · mes 2' })).toContainText('Swing y articulación');
    await abrirFocos(page);
    await expect(page.locator('#f-l-swing-articulacion')).toBeChecked();
    await abrirFocos(page);
    await page.locator('#f-l-escalas-bebop').check();
    await page.getByRole('button', { name: 'Usar la materia' }).click();
    await abrirFocos(page);
    await expect(page.locator('#f-l-swing-articulacion')).toBeChecked();
  });

  test('empezar el mes con los focos de la materia que toca la deja en curso', async ({ page }) => {
    await page.goto('/#/mes');
    await page.getByRole('button', { name: 'Empezar el mes con estos focos' }).click();
    expect((await guardado(page)).actual).toBe(1);
  });

  test('datos dañados no rompen la pantalla y no se desborda en el celular', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('harmonyjazz:curricula', JSON.stringify({ aprobadas: [1, 'x', 99, 2.5], actual: 'z', checks: { '1': [0, 'q', 50], zz: [1] } })));
    await page.goto('/#/curricula');
    await expect(page.getByText('1 de 36')).toBeVisible();
    await page.locator('details.semester').first().locator('li.materia').nth(1).locator('summary').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
