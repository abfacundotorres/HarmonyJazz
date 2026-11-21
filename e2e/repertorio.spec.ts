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

const TEMA_3_4 = { id: 'u:vals', name: 'Vals de prueba', composer: '', key: 'C', mode: 'major', chart: '@3/4 Dm7 | G7 | Cmaj7 | Cmaj7', tempo: 120, style: 'swing' };

test.describe('ejercicios sobre un tema', () => {
  const abrirEjercicios = async (page: import('@playwright/test').Page) => {
    const tema = page.getByRole('region', { name: 'Hojas de otoño' });
    await tema.getByText('Ejercicios sobre este tema').click();
    return tema;
  };

  test('un tema ofrece guide tones, arpegios, aproximaciones y 1-2-3-5; arma la partitura del elegido y marca el avance en su tonalidad', async ({ page }) => {
    await conTema(page);
    await page.goto('/#/repertorio');
    const tema = await abrirEjercicios(page);
    const botones = tema.getByRole('group', { name: 'Ejercicio' }).getByRole('button');
    await expect(botones).toHaveCount(6);
    await expect(tema.locator('.exercise')).toHaveCount(0); // sin elegir nada no se arma ninguna partitura
    await tema.getByRole('button', { name: 'Guide tones del tema', exact: true }).click();
    const ej = tema.locator('.exercise');
    await expect(ej.getByRole('heading', { name: 'Hojas de otoño: Guide tones del tema' })).toBeVisible();
    await expect(ej.locator('svg').first()).toBeVisible();
    // pasa a otra tonalidad y marca (las teclas se leen en Si♭: la escrita «D» es Do de concierto)
    await ej.getByRole('radio', { name: /^D/ }).click();
    await ej.getByRole('button', { name: /Salió limpio/ }).click();
    const m = await page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:mastery')!));
    expect(Object.keys(m)).toEqual(['tema:u:hoja:guide']);
    expect(Object.keys(m['tema:u:hoja:guide'])).toEqual(['C']);
    expect(m['tema:u:hoja:guide'].C).toBeGreaterThan(0);
    // otro ejercicio reemplaza al anterior
    await tema.getByRole('button', { name: 'Arpegios acorde por acorde', exact: true }).click();
    await expect(tema.locator('.exercise')).toHaveCount(1);
    await expect(tema.locator('.exercise').getByRole('heading')).toContainText('Arpegios acorde por acorde');
  });

  test('un enlace de repaso abre ese ejercicio en esa tonalidad; una tonalidad inválida no rompe', async ({ page }) => {
    await conTema(page);
    await page.goto('/#/repertorio?t=u%3Ahoja&ex=arp3&k=Eb');
    const ej = page.getByRole('region', { name: 'Hojas de otoño' }).locator('.exercise');
    await expect(ej.getByRole('heading')).toContainText('Arpegios desde la 3ª');
    // k=Eb es de concierto; en la vista Si♭ la tecla marcada se lee «F»
    await expect(ej.getByRole('radio', { checked: true })).toHaveCount(1);
    await expect(ej.getByRole('radio', { checked: true })).toHaveAccessibleName(/^F/);
    await page.goto('/#/repertorio?t=u%3Ahoja&ex=guide&k=ZZ');
    await page.reload();
    await expect(page.getByRole('region', { name: 'Hojas de otoño' }).locator('.exercise').getByRole('heading')).toContainText('Guide tones del tema');
    await page.goto('/#/repertorio?t=u%3Ahoja&ex=nada');
    await expect(page.getByRole('region', { name: 'Hojas de otoño' }).locator('.exercise')).toHaveCount(0);
  });

  test('un tema en 3/4 explica que los ejercicios son de 4/4 y no los ofrece', async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('harmonyjazz:library', JSON.stringify({ tunes: [t] })), TEMA_3_4);
    await page.goto('/#/repertorio');
    const tema = page.getByRole('region', { name: 'Vals de prueba' });
    await expect(tema).toContainText('Los ejercicios generados son de 4/4');
    await expect(tema.getByText('Ejercicios sobre este tema')).toHaveCount(0);
  });

  test('lo marcado entra en el repaso de Hoy y de Progreso con el nombre del tema y lleva de vuelta al ejercicio', async ({ page }) => {
    await page.addInitScript((t) => {
      localStorage.setItem('harmonyjazz:library', JSON.stringify({ tunes: [t] }));
      const day = Math.floor(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) / 86400000);
      localStorage.setItem('harmonyjazz:mastery', JSON.stringify({ 'tema:u:hoja:guide': { G: 100 } }));
      localStorage.setItem('harmonyjazz:seen', JSON.stringify({ 'tema:u:hoja:guide': { G: { d: day - 12, n: 1 } } })); // 12 días: vencido
    }, TEMA);
    await page.goto('/#/progreso');
    const fila = page.locator('.reviewlist a', { hasText: 'Hojas de otoño' });
    await expect(fila).toContainText('Guide tones del tema');
    await expect(fila).toHaveAttribute('href', /#\/repertorio\?t=u%3Ahoja&ex=guide&k=G/);
    await fila.click();
    await expect(page.getByRole('region', { name: 'Hojas de otoño' }).locator('.exercise').getByRole('heading')).toContainText('Guide tones del tema');
    // y en Hoy
    await page.goto('/#/hoy');
    await expect(page.locator('.reviewlist a', { hasText: 'Hojas de otoño' })).toBeVisible();
  });

  test('si se borra el tema, su marca no aparece en el repaso ni rompe nada', async ({ page }) => {
    await page.addInitScript(() => {
      const day = Math.floor(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) / 86400000);
      localStorage.setItem('harmonyjazz:mastery', JSON.stringify({ 'tema:u:borrado:guide': { G: 100 } }));
      localStorage.setItem('harmonyjazz:seen', JSON.stringify({ 'tema:u:borrado:guide': { G: { d: day - 12, n: 1 } } }));
    });
    await page.goto('/#/progreso');
    await expect(page.getByRole('heading', { name: 'Tu progreso' })).toBeVisible();
    await expect(page.locator('.reviewlist a', { hasText: /borrado|guide/i })).toHaveCount(0);
  });
});
