import { expect, openBlock, test } from './helpers';

/** Pasa al día siguiente del mes recién empezado (sesión 2: toca el foco de lenguaje). */
async function alSegundoDia(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const hoy = new Date();
    const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);
    const mes = JSON.parse(localStorage.getItem('harmonyjazz:month')!);
    mes.startDay = Math.floor(Date.UTC(ayer.getFullYear(), ayer.getMonth(), ayer.getDate()) / 86400000);
    localStorage.setItem('harmonyjazz:month', JSON.stringify(mes));
    localStorage.setItem('harmonyjazz:log', JSON.stringify({ [iso(ayer)]: { done: ['hoy'], minutes: 0 } }));
  });
  await page.goto('/#/hoy');
  await page.reload();
}

const hoy = (page: import('@playwright/test').Page) => page.getByRole('navigation', { name: 'Pantallas de Hoy' });

test.describe('el mes con focos', () => {
  test('sin focos elegidos Hoy sigue con el plan de siempre, sin avisos del mes, y Mi mes está en la subbarra', async ({ page }) => {
    await page.goto('/#/hoy');
    await expect(page.locator('.notice.monthbar')).toHaveCount(0);
    await expect(page.locator('.hero')).toContainText('Tema de la semana');
    await expect(page.locator('article.block .bhead')).toHaveCount(3);
    await hoy(page).getByRole('link', { name: 'Mi mes' }).click();
    await expect(page).toHaveURL(/#\/mes$/);
    await expect(hoy(page).getByRole('link')).toHaveText(['Plan de hoy', 'Mi mes', 'Progreso']);
  });

  test('hay focos nuevos para elegir (tríadas menores, mayores y menores, acordes de cuatro notas, células) y el plan de Hoy los trabaja', async ({ page }) => {
    await page.goto('/#/mes');
    for (const t of ['Tríadas menores', 'Tríadas mayores y menores', 'Acordes de cuatro notas (maj7, m7, 7, m7♭5)', 'Células 1-2-3-5 (mayor) y 1-♭3-4-5 (menor)', 'Ritmo, síncopa y tresillos', 'Arpegios, intervalos y saltos']) {
      await expect(page.locator('.focuscard b', { hasText: t }).first()).toBeVisible();
    }
    await page.locator('#f-l-celulas-1235').check();
    await page.locator('#f-t-ritmo-precision').check();
    await page.getByRole('button', { name: 'Empezar el mes con estos focos' }).click();
    await expect(page).toHaveURL(/#\/hoy$/);
    await expect(page.locator('article.block .bhead').nth(1)).toContainText('Técnica: Ritmo, síncopa y tresillos');
    await alSegundoDia(page);
    await expect(page.locator('article.block .bhead').nth(1)).toContainText('Lenguaje: Células 1-2-3-5');
  });

  test('cada tarea de los focos nuevos trae ideas de lenguaje para tocar (frases sobre el ii–V–I)', async ({ page }) => {
    await page.goto('/#/mes');
    await page.locator('#f-l-triadas-menores').check();
    await page.getByRole('button', { name: 'Empezar el mes con estos focos' }).click();
    await alSegundoDia(page);
    const block = await openBlock(page, 'Lenguaje: Tríadas menores');
    await block.locator('details.exercise summary').first().click();
    const ideas = block.locator('details.ideas');
    await expect(ideas.locator('summary')).toHaveText('Ideas para tocar (10)');
    await ideas.locator('summary').click();
    await expect(ideas.locator('svg').first()).toBeVisible();
    await expect(ideas.getByText(/Idea 10/).first()).toBeVisible();
    await expect(ideas.locator('figcaption')).toContainText('10 ideas de tres compases sobre el ii–V–I');
  });

  test('más consignas de lenguaje para elegir: pares de tríadas, intervalos, pentatónicas, blues, sustitución tritonal y más', async ({ page }) => {
    await page.goto('/#/mes');
    for (const t of ['Pares de tríadas', 'Intervalos: terceras, cuartas y saltos', 'Pentatónicas sobre acordes', 'Lenguaje de blues', 'Sustitución tritonal', 'La escala de cada acorde (modos)', 'Motivos y desarrollo', 'Side-slipping (tocar «afuera»)', 'Desplazamiento rítmico']) {
      await expect(page.locator('.focuscard b', { hasText: t }).first()).toBeVisible();
    }
    await page.locator('#f-l-triad-pairs').check();
    await page.getByRole('button', { name: 'Empezar el mes con estos focos' }).click();
    await alSegundoDia(page);
    await expect(page.locator('article.block .bhead').nth(1)).toContainText('Lenguaje: Pares de tríadas');
    const block = await openBlock(page, 'Lenguaje: Pares de tríadas');
    await block.locator('details.exercise summary').first().click();
    await expect(block.locator('details.exercise[open]')).toContainText('F-A-C y G-B-D');
  });

  test('otra tanda de focos: técnica (dinámica, digitación, boquilla, colores) y lenguaje (bebop, Coltrane, Rhythm changes, ii–V–i menor, simétricas, turnarounds, swing, grabaciones, vals)', async ({ page }) => {
    await page.goto('/#/mes');
    for (const t of ['Dinámica y control del aire', 'Digitación y velocidad', 'Boquilla y buzzing', 'Escalas y colores del jazz', 'Escalas bebop', 'Cambios de Coltrane', 'Rhythm changes (el puente en cadena)', 'ii–V–i menor y dominante con tensiones', 'Escalas simétricas (disminuida y tonos enteros)', 'Turnarounds (I–vi–ii–V)', 'Swing y articulación jazzística', 'Aprender de grabaciones (transcribir)', 'Improvisar en 3/4 y 6/8']) {
      await expect(page.locator('.focuscard b', { hasText: t }).first()).toBeVisible();
    }
    await page.locator('#f-t-dinamica-aire').check();
    await page.locator('#f-l-escalas-bebop').check();
    await page.getByRole('button', { name: 'Empezar el mes con estos focos' }).click();
    await expect(page.locator('article.block .bhead').nth(1)).toContainText('Técnica: Dinámica y control del aire');
    await alSegundoDia(page);
    await expect(page.locator('article.block .bhead').nth(1)).toContainText('Lenguaje: Escalas bebop');
  });

  test('se eligen los tres focos y el plan de Hoy pasa a trabajarlos: tres bloques, un solo foco por día', async ({ page }) => {
    await page.goto('/#/mes');
    await expect(page.getByRole('heading', { name: 'Elegí los focos de este mes' })).toBeVisible();
    await page.locator('#f-t-largas-artic').check();
    await page.locator('#f-l-triadas-mayores').check();
    // el tema: sin temas propios se ofrece una forma incluida y se explica cómo cargar uno
    await expect(page.getByText(/cargá su cifrado en Play-along → Mis temas/)).toBeVisible();
    await page.getByRole('button', { name: 'Empezar el mes con estos focos' }).click();
    await expect(page).toHaveURL(/#\/hoy$/);

    await expect(page.locator('.notice.monthbar')).toHaveCount(0);
    await expect(page.locator('.hero')).toContainText('Semana 1 de 4');
    await expect(page.locator('.hero')).toContainText('sesión 1');
    const heads = page.locator('article.block .bhead');
    await expect(heads).toHaveCount(3);
    await expect(heads.nth(0)).toContainText('Calentamiento');
    await expect(heads.nth(1)).toContainText('Técnica: Nota larga y articulación');
    await expect(heads.nth(2)).toContainText('Repertorio:');
    // sin minutos en ningún bloque
    expect(await heads.allInnerTexts().then((t) => t.join(' '))).not.toMatch(/\d+ min\b/);
    // la tarea de técnica de la sesión 1 explica qué se busca esa semana
    const tecnica = await openBlock(page, 'Técnica: Nota larga y articulación');
    await expect(tecnica).toContainText('Semana 1 de 4 · Sonido y ataque');
    await expect(tecnica.locator('details.exercise')).toHaveCount(1);
    // y se guarda
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:month')!))).toMatchObject({ tech: 't-largas-artic', lang: 'l-triadas-mayores' });
    // la sesión 2 trae el foco de lenguaje
    await alSegundoDia(page);
    await expect(page.locator('.hero')).toContainText('sesión 2');
    await expect(heads.nth(1)).toContainText('Lenguaje: Tríadas mayores');
  });

  test('con un tema propio de Mis temas, el repertorio trabaja ese tema y los enlaces lo abren', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('harmonyjazz:library', JSON.stringify({ tunes: [{ id: 'u:hoja', name: 'Hojas de otoño', composer: '', key: 'G', mode: 'minor', chart: 'Cm7 | F7 | Bbmaj7 | Ebmaj7', tempo: 120, style: 'swing' }] }));
    });
    await page.goto('/#/mes');
    await page.getByLabel('Tema de repertorio').selectOption({ label: 'Hojas de otoño' });
    await page.getByRole('button', { name: 'Empezar el mes con estos focos' }).click();
    const rep = await openBlock(page, 'Repertorio: Hojas de otoño');
    await expect(rep).toContainText('Semana 1 de 4 · Conocer la forma');
    await expect(rep).toContainText('«Hojas de otoño»');
    await rep.getByRole('link', { name: 'Abrir el tema' }).click();
    await expect(page).toHaveURL(/#\/playalong\?p=u%3Ahoja/);
    await expect(page.getByLabel('Tema', { exact: true })).toHaveValue('u:hoja');
  });

  test('las sesiones avanzan con los días en que se abrió Hoy: la sesión 3 trae la segunda tarea de técnica', async ({ page }) => {
    await page.addInitScript(() => {
      const hoy = new Date();
      const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);
      const antes = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 2);
      const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const mes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
      const dia = (d: Date) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
      localStorage.setItem('harmonyjazz:month', JSON.stringify({ month: mes, tech: 't-largas-artic', lang: 'l-triadas-mayores', rep: 'ii-v-i', startDay: dia(antes) }));
      localStorage.setItem('harmonyjazz:log', JSON.stringify({ [iso(antes)]: { done: ['hoy'], minutes: 0 }, [iso(ayer)]: { done: ['hoy'], minutes: 0 } }));
    });
    await page.goto('/#/hoy');
    await expect(page.locator('.hero')).toContainText('sesión 3');
    const tecnica = await openBlock(page, 'Técnica: Nota larga y articulación');
    // la sesión 3 es la segunda vez que toca técnica: la segunda tarea del foco (ataques suaves)
    await expect(tecnica.locator('details.exercise summary')).toContainText('Ataques suaves');
  });

  test('en un mes nuevo se pide elegir de nuevo, y se puede seguir con los mismos focos', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('harmonyjazz:month', JSON.stringify({ month: '2020-01', tech: 't-flexibilidad', lang: 'l-guide-tones', rep: 'ii-v-i', startDay: 18000 }));
    });
    await page.goto('/#/hoy');
    await expect(page.locator('.notice.monthbar')).toHaveCount(0);
    await expect(page.locator('.hero')).toContainText('Tema de la semana'); // vuelve al plan de siempre mientras tanto
    await expect(page.locator('article.block .bhead')).toHaveCount(3);
    await hoy(page).getByRole('link', { name: 'Mi mes' }).click();
    await expect(page.getByText(/¿Seguís con los mismos focos \(Flexibilidad y ligaduras, Guide tones/)).toBeVisible();
    await page.getByRole('button', { name: 'Seguir con los mismos' }).click();
    await expect(page.locator('.hero')).toContainText('Tu mes');
    await expect(page.locator('article.block .bhead').nth(1)).toContainText('Técnica: Flexibilidad y ligaduras');
    await expect(page.locator('article.block .bhead')).toHaveCount(3);
  });

  test('con el mes en marcha, Mi mes muestra el resumen y deja cambiar los focos', async ({ page }) => {
    await page.goto('/#/mes');
    await page.getByRole('button', { name: 'Empezar el mes con estos focos' }).click();
    await page.goto('/#/mes');
    await expect(page.getByRole('heading', { name: /^Tu mes:/ })).toBeVisible();
    await expect(page.getByText(/Vas por la sesión 1/)).toBeVisible();
    await page.getByRole('button', { name: 'Cambiar los focos' }).click();
    await page.locator('#f-t-flexibilidad').check();
    await page.getByRole('button', { name: 'Empezar el mes con estos focos' }).click();
    await expect(page.locator('article.block .bhead').nth(1)).toContainText('Técnica: Flexibilidad y ligaduras');
  });

  test('los recorridos se pueden leer antes de elegir', async ({ page }) => {
    await page.goto('/#/mes');
    const card = page.locator('.focuscard', { has: page.locator('#f-t-largas-artic') });
    await card.locator('summary').click();
    await expect(card.locator('.outline > li')).toHaveCount(4);
    await expect(card).toContainText('Semana 3: Articulación');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
