import { abrirMenu, abrirPasos, expect, test } from './helpers';

const TEMA = { id: 'u:hoja', name: 'Hojas de otoño', composer: '', key: 'G', mode: 'minor', chart: 'Cm7 | F7 | Bbmaj7 | Ebmaj7', tempo: 120, style: 'swing' };
const conTema = (page: import('@playwright/test').Page) => page.addInitScript((t) => localStorage.setItem('harmonyjazz:library', JSON.stringify({ tunes: [t] })), TEMA);
const guardado = (page: import('@playwright/test').Page) => page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:repertorio') ?? 'null'));

test.describe('mi repertorio', () => {
  test('sin temas explica cómo cargar uno', async ({ page }) => {
    await page.goto('/#/repertorio');
    await expect(page.getByRole('heading', { name: 'Temas', exact: true })).toBeVisible();
    await expect(page.getByText(/Todavía no cargaste ningún tema/)).toBeVisible();
    // Repertorio está en el grupo Tocar del menú y es la pantalla actual
    const menu = await abrirMenu(page);
    await expect(menu.getByRole('link', { name: 'Temas', exact: true })).toHaveAttribute('aria-current', 'page');
  });

  test('cada tema propio tiene sus siete pasos: se tildan, avanzan el progreso y se recuerdan', async ({ page }) => {
    await conTema(page);
    await page.goto('/#/repertorio');
    await abrirPasos(page);
    const tema = page.getByRole('region', { name: 'Hojas de otoño' });
    await expect(tema.locator('ol.pasos li')).toHaveCount(7);
    await expect(tema).toContainText('0 de 7 pasos');
    await expect(tema).toContainText('Todavía no lo tocaste');
    await expect(tema).toContainText('sigue: La forma');
    await tema.getByLabel('Hojas de otoño: La forma').check();
    await tema.getByLabel('Hojas de otoño: Guide tones').check();
    await expect(tema).toContainText('2 de 7 pasos');
    await expect(tema).toContainText('Lo tocaste hoy');
    await expect(tema).toContainText('sigue: Fundamentales');
    expect((await guardado(page))['u:hoja'].hechos).toEqual([0, 2]);
    await page.reload();
    await abrirPasos(page);
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
    await abrirPasos(page);
    const tema = page.getByRole('region', { name: 'Hojas de otoño' });
    await expect(tema.locator('ol.pasos input[type="checkbox"]')).toHaveCount(7); // las casillas de los pasos (cada uno tiene además su campo de tempo)
    for (const c of await tema.locator('ol.pasos input[type="checkbox"]').all()) await c.check();
    await expect(tema).toContainText('7 de 7 pasos');
    await expect(tema).toContainText('¡completo!');
    await tema.getByRole('button', { name: 'Lo toqué hoy' }).click();
    await expect(tema).toContainText('Lo tocaste hoy');
  });

  test('el tema del mes de la currícula, si es una forma incluida, aparece primero', async ({ page }) => {
    await page.goto('/#/mes');
    await page.getByRole('button', { name: 'Empezar el mes con estos focos' }).click();
    await page.goto('/#/repertorio');
    await abrirPasos(page);
    const tema = page.locator('section.tema').first();
    await expect(tema).toContainText('tema del mes');
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
    await expect(repaso).toContainText('Tema · Hojas de otoño');
    await expect(repaso).toContainText('Hace 9 días que no lo tocás');
    await expect(repaso).toContainText('sigue: Guide tones');
    await repaso.getByRole('link', { name: /Tema · Hojas de otoño/ }).click();
    await expect(page).toHaveURL(/#\/playalong\?p=u%3Ahoja$/); // va directo a tocarlo
    await expect(page.getByRole('button', { name: 'Practicar el siguiente tramo flojo' })).toHaveCount(0); // sin flojos no hay atajo
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
    await abrirPasos(page);
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
    await abrirPasos(page);
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
    await abrirPasos(page);
    const ej = page.getByRole('region', { name: 'Hojas de otoño' }).locator('.exercise');
    await expect(ej.getByRole('heading')).toContainText('Arpegios desde la 3ª');
    // k=Eb es de concierto; en la vista Si♭ la tecla marcada se lee «F»
    await expect(ej.getByRole('radio', { checked: true })).toHaveCount(1);
    await expect(ej.getByRole('radio', { checked: true })).toHaveAccessibleName(/^F/);
    await page.goto('/#/repertorio?t=u%3Ahoja&ex=guide&k=ZZ');
    await abrirPasos(page);
    await page.reload();
    await abrirPasos(page);
    await expect(page.getByRole('region', { name: 'Hojas de otoño' }).locator('.exercise').getByRole('heading')).toContainText('Guide tones del tema');
    await page.goto('/#/repertorio?t=u%3Ahoja&ex=nada');
    await abrirPasos(page);
    await expect(page.getByRole('region', { name: 'Hojas de otoño' }).locator('.exercise')).toHaveCount(0);
  });

  test('un tema en 3/4 explica que los ejercicios son de 4/4 y no los ofrece', async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('harmonyjazz:library', JSON.stringify({ tunes: [t] })), TEMA_3_4);
    await page.goto('/#/repertorio');
    await abrirPasos(page);
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

test.describe('tempo y tonalidades de cada paso', () => {
  const tema = (page: import('@playwright/test').Page) => page.getByRole('region', { name: 'Hojas de otoño' });
  const paso = (page: import('@playwright/test').Page, titulo: string) => tema(page).locator('ol.pasos li', { hasText: titulo }).first();
  const guardadoDetalle = (page: import('@playwright/test').Page) => page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:repertorio') ?? '{}')['u:hoja']?.detalle);

  test('«De memoria, a tempo»: se anota el tempo y dice si llegó al del tema', async ({ page }) => {
    await conTema(page); // el tema se carga a 120 bpm
    await page.goto('/#/repertorio');
    await abrirPasos(page);
    const memoria = paso(page, 'De memoria, a tempo');
    // sin tildar el paso (ni ser el que sigue) no se ofrece anotar nada
    await expect(memoria.getByText('Tempo y tonalidades')).toHaveCount(0);
    await tema(page).getByLabel('Hojas de otoño: De memoria, a tempo').check();
    await expect(memoria.locator('.paso-resumen')).toHaveCount(0); // sin nada anotado no hay resumen
    await memoria.getByText('Tempo y tonalidades').click();
    await expect(memoria).toContainText('tempo del tema: 120 bpm');
    const bpm = memoria.getByLabel('Tempo del paso De memoria, a tempo de Hojas de otoño');
    await bpm.fill('100');
    await bpm.press('Enter');
    await expect(memoria.locator('.paso-resumen')).toContainText('♩ 100 bpm');
    await expect(memoria.locator('.paso-resumen')).toContainText('faltan 20 bpm para el tempo del tema (120)');
    await bpm.fill('130');
    await bpm.press('Enter');
    await expect(memoria.locator('.paso-resumen')).toContainText('✓ llegaste al tempo del tema (120)');
    expect((await guardadoDetalle(page))[5]).toEqual({ bpm: 130, keys: [] });
    // el tema muestra su mejor tempo
    await expect(page.getByTestId('resumen-tema')).toContainText('Mejor tempo anotado: 130 bpm');
    // anotar algo cuenta como haberlo tocado hoy y no destilda ni tilda otros pasos
    await expect(tema(page)).toContainText('Lo tocaste hoy');
    await expect(tema(page)).toContainText('1 de 7 pasos');
    // vaciar el campo lo borra
    await bpm.fill('');
    await bpm.press('Enter');
    await expect(memoria.locator('.paso-resumen')).toHaveCount(0);
    expect(await guardadoDetalle(page)).toBeUndefined();
  });

  test('el tempo se lleva a 40–320 y se recuerda al recargar', async ({ page }) => {
    await conTema(page);
    await page.goto('/#/repertorio');
    await abrirPasos(page);
    const guide = paso(page, 'Guide tones');
    await tema(page).getByLabel('Hojas de otoño: Guide tones').check();
    await guide.getByText('Tempo y tonalidades').click();
    const bpm = guide.getByLabel('Tempo del paso Guide tones de Hojas de otoño');
    await bpm.fill('9999');
    await bpm.press('Enter');
    await expect(guide.locator('.paso-resumen')).toContainText('♩ 320 bpm');
    await bpm.fill('5');
    await bpm.press('Enter');
    await expect(guide.locator('.paso-resumen')).toContainText('♩ 40 bpm');
    await page.reload();
    await abrirPasos(page);
    await expect(paso(page, 'Guide tones').locator('.paso-resumen')).toContainText('♩ 40 bpm');
  });

  test('«La melodía»: se marcan las tonalidades en que la tocaste, se leen como el resto de la app y se guardan en concierto', async ({ page }) => {
    await conTema(page);
    await page.goto('/#/repertorio');
    await abrirPasos(page);
    const melodia = paso(page, 'La melodía');
    await tema(page).getByLabel('Hojas de otoño: La melodía').check();
    await melodia.getByText('Tempo y tonalidades').click();
    const grupo = melodia.getByRole('group', { name: 'Tonalidades del paso La melodía de Hojas de otoño' });
    await expect(grupo.getByRole('button')).toHaveCount(12);
    // la vista por defecto es Si♭: la tecla escrita «G» es el Fa de concierto
    await grupo.getByRole('button', { name: 'G', exact: true }).click();
    await grupo.getByRole('button', { name: 'C', exact: true }).click(); // Si♭ de concierto
    await expect(grupo.getByRole('button', { name: 'G', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(melodia.locator('.paso-resumen')).toContainText('en G, C'); // en el orden de las doce tonalidades de concierto (Fa, Si♭)
    expect((await guardadoDetalle(page))[3].keys).toEqual(['F', 'Bb']);
    await expect(page.getByTestId('resumen-tema')).toContainText('Tonalidades tocadas: 2 de 12');
    // desmarcar
    await grupo.getByRole('button', { name: 'G', exact: true }).click();
    await expect(grupo.getByRole('button', { name: 'G', exact: true })).toHaveAttribute('aria-pressed', 'false');
    expect((await guardadoDetalle(page))[3].keys).toEqual(['Bb']);
    // en concierto se leen como se guardan
    await page.goto('/#/mas');
    await page.getByRole('button', { name: 'Concierto', exact: true }).first().click();
    await page.goto('/#/repertorio');
    await abrirPasos(page);
    await expect(paso(page, 'La melodía').locator('.paso-resumen')).toContainText('en B♭');
  });

  test('tildar el paso no pierde lo anotado, y los temas de antes (sin detalle) siguen igual', async ({ page }) => {
    await page.addInitScript((t) => {
      localStorage.setItem('harmonyjazz:library', JSON.stringify({ tunes: [t] }));
      localStorage.setItem('harmonyjazz:repertorio', JSON.stringify({ 'u:hoja': { hechos: [0, 1], ultimo: 1, inicio: 1 } })); // formato anterior
    }, TEMA);
    await page.goto('/#/repertorio');
    await abrirPasos(page);
    await expect(tema(page)).toContainText('2 de 7 pasos');
    await expect(tema(page).locator('.paso-resumen')).toHaveCount(0);
    const forma = paso(page, 'La forma');
    await forma.getByText('Tempo y tonalidades').click();
    await forma.getByLabel('Tempo del paso La forma de Hojas de otoño').fill('90');
    await forma.getByLabel('Tempo del paso La forma de Hojas de otoño').press('Enter');
    await tema(page).getByLabel('Hojas de otoño: La forma').uncheck();
    await expect(forma.locator('.paso-resumen')).toContainText('♩ 90 bpm');
    await tema(page).getByLabel('Hojas de otoño: La forma').check();
    await expect(forma.locator('.paso-resumen')).toContainText('♩ 90 bpm');
  });

  test('un dato guardado dañado no rompe la pantalla', async ({ page }) => {
    await page.addInitScript((t) => {
      localStorage.setItem('harmonyjazz:library', JSON.stringify({ tunes: [t] }));
      localStorage.setItem('harmonyjazz:repertorio', JSON.stringify({ 'u:hoja': { hechos: [1], ultimo: 1, inicio: 1, detalle: { 3: { bpm: 'x', keys: [1, 'H'] }, 99: 5, 5: { bpm: 140, keys: ['F'] } } } }));
    }, TEMA);
    await page.goto('/#/repertorio');
    await abrirPasos(page);
    await expect(tema(page)).toContainText('1 de 7 pasos');
    await expect(paso(page, 'De memoria, a tempo').locator('.paso-resumen')).toContainText('♩ 140 bpm');
    await expect(paso(page, 'La melodía').locator('.paso-resumen')).toHaveCount(0);
  });
});

test.describe('Temas: estados, orden y tema en estudio', () => {
  const T = (id: string, name: string) => ({ id, name, composer: '', key: 'C', mode: 'major', chart: 'Dm7 | G7 | Cmaj7 | Cmaj7', tempo: 120, style: 'swing' });
  const SIETE = [0, 1, 2, 3, 4, 5, 6];
  const preparar = (page: import('@playwright/test').Page) =>
    page.addInitScript(
      ([tunes, rep]) => {
        localStorage.setItem('harmonyjazz:library', JSON.stringify({ tunes }));
        localStorage.setItem('harmonyjazz:repertorio', JSON.stringify(rep));
      },
      [
        [T('u:nuevo', 'Tema nuevo'), T('u:listo', 'Tema listo'), T('u:medio', 'Tema a medias')],
        { 'u:listo': { hechos: SIETE, ultimo: 1, inicio: 1 }, 'u:medio': { hechos: [0], ultimo: 1, inicio: 1 } },
      ] as const,
    );

  test('cada tema muestra su estado y la lista va: aprendiendo, sin empezar, terminados', async ({ page }) => {
    await preparar(page);
    await page.goto('/#/repertorio');
    await expect(page.getByRole('status').first()).toContainText('1 aprendiendo · 1 sin empezar · 1 terminado');
    await expect(page.locator('.tema-nombre')).toHaveText(['Tema a medias', 'Tema nuevo', 'Tema listo']);
    await expect(page.getByRole('region', { name: 'Tema a medias' })).toContainText('Aprendiendo');
    await expect(page.getByRole('region', { name: 'Tema nuevo' })).toContainText('Sin empezar');
    await expect(page.getByRole('region', { name: 'Tema listo' })).toContainText('✓ Terminado');
    // cada tema es una fila plegada (nombre, estado y avance en una línea); se abre al tocarla
    for (const n of ['Tema a medias', 'Tema nuevo', 'Tema listo']) await expect(page.getByRole('region', { name: n }).locator('details.tema-det')).not.toHaveAttribute('open', '');
    await page.getByRole('region', { name: 'Tema a medias' }).locator('details.tema-det > summary').click();
    await expect(page.getByRole('region', { name: 'Tema a medias' }).getByRole('button', { name: 'Lo toqué hoy' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Tema nuevo' }).getByRole('button', { name: 'Lo toqué hoy' })).toBeHidden();
  });

  test('un tema terminado hace tiempo avisa que toca repasarlo', async ({ page }) => {
    await preparar(page);
    await page.goto('/#/repertorio');
    await expect(page.getByRole('region', { name: 'Tema listo' })).toContainText('Toca repasarlo');
  });

  test('«Estudiar este» lo pasa a tema en estudio, arriba de todo, y se ve en Hoy', async ({ page }) => {
    await preparar(page);
    await page.goto('/#/repertorio');
    await abrirPasos(page);
    await page.getByRole('region', { name: 'Tema nuevo' }).getByRole('button', { name: 'Estudiar este' }).click();
    await expect(page.locator('.tema-nombre').first()).toHaveText('Tema nuevo'); // pasa arriba de todo
    await expect(page.getByRole('region', { name: 'Tema nuevo' })).toContainText('en estudio');
    await expect(page.getByRole('region', { name: 'Tema nuevo' }).getByRole('button', { name: 'Estudiar este' })).toHaveCount(0);
    await page.goto('/#/hoy');
    await expect(page.getByRole('region', { name: 'Tema en estudio' })).toContainText('Tema nuevo');
    await page.goto('/#/repertorio');
    await abrirPasos(page);
    await page.getByRole('region', { name: 'Tema nuevo' }).getByRole('button', { name: 'Dejar de estudiarlo' }).click();
    await expect(page.getByRole('region', { name: 'Tema nuevo' })).not.toContainText('en estudio');
  });
});

test.describe('Temas: Mis temas y Mi colección viven acá', () => {
  test('en Temas están el editor y la colección; el Play-along ya no los trae', async ({ page }) => {
    await page.goto('/#/repertorio');
    await expect(page.locator('.library')).toBeVisible();
    await expect(page.locator('details.coleccion')).toBeVisible();
    await page.goto('/#/playalong');
    await page.waitForSelector('.player');
    await expect(page.locator('.library')).toHaveCount(0);
    await expect(page.locator('details.coleccion')).toHaveCount(0);
  });

  test('un tema escrito como texto se guarda y aparece en la lista de Temas, sin salir de la pantalla', async ({ page }) => {
    await page.goto('/#/repertorio?cargar=1');
    await page.getByLabel('Nombre').fill('Tema de texto');
    await page.getByRole('button', { name: 'Texto' }).click();
    await page.getByRole('textbox', { name: 'Cifrado' }).fill('Dm7 | G7 | Cmaj7 | Cmaj7');
    await page.getByRole('button', { name: 'Guardar tema' }).click();
    await expect(page).toHaveURL(/#\/repertorio/);
    await expect(page.getByRole('region', { name: 'Tema de texto' })).toContainText('Sin empezar');
    await abrirPasos(page);
    await page.getByRole('region', { name: 'Tema de texto' }).getByRole('link', { name: 'Abrir en el play-along' }).click();
    await expect(page.getByLabel('Tema', { exact: true })).toHaveValue(/^u:/);
  });
});

test.describe('compases flojos: se ven en Temas y en Hoy y se practican con un toque', () => {
  const FLOJOS = { 'u:hoja': [1, 2, 5] };
  const preparar = (page: import('@playwright/test').Page) =>
    page.addInitScript(
      ([t, flojos]) => {
        localStorage.setItem('harmonyjazz:library', JSON.stringify({ tunes: [t] }));
        localStorage.setItem('harmonyjazz:flojos', JSON.stringify(flojos));
        const hoy = Math.floor(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) / 86400000);
        localStorage.setItem('harmonyjazz:repertorio', JSON.stringify({ 'u:hoja': { hechos: [0], ultimo: hoy - 9, inicio: hoy - 20 } }));
      },
      [{ ...TEMA, chart: 'Cm7 | F7 | Bbmaj7 | Ebmaj7 | Cm7 | F7' }, FLOJOS] as const,
    );

  test('en Temas, la tarjeta del tema dice cuáles compases le cuestan y lleva a practicarlos', async ({ page }) => {
    await preparar(page);
    await page.goto('/#/repertorio');
    await abrirPasos(page);
    const tema = page.getByRole('region', { name: 'Hojas de otoño' });
    await expect(tema.getByTestId('flojos-tema')).toContainText('Te cuestan los compases 2–3 y 6');
    await tema.getByRole('link', { name: 'Practicar solo esos' }).click();
    await expect(page).toHaveURL(/#\/playalong\?p=u%3Ahoja&flojos=1/);
    // arranca en el primer tramo flojo
    await expect(page.locator('.loopbar')).toContainText('compases 2–3');
  });

  test('en Hoy, «Para repasar» muestra los flojos y deja practicarlos directo', async ({ page }) => {
    await preparar(page);
    await page.goto('/#/hoy');
    await expect(page.locator('#repaso')).toContainText('te cuestan los compases 2–3 y 6');
    await page.locator('#repaso').getByRole('link', { name: 'Practicar solo los compases flojos de Hojas de otoño' }).click();
    await expect(page).toHaveURL(/flojos=1/);
    await expect(page.locator('.loopbar')).toContainText('compases 2–3');
  });
});

test.describe('Temas: mapa de las doce tonalidades', () => {
  test('se marcan tocando, la sugerencia sigue el ciclo de cuartas desde la del tema y se guarda en «La melodía»', async ({ page }) => {
    await conTema(page); // Hojas de otoño: Sol (concierto) menor
    await page.goto('/#/repertorio');
    await abrirPasos(page);
    const mapa = page.getByRole('region', { name: 'Hojas de otoño' }).getByRole('group', { name: 'Tonalidades de Hojas de otoño' });
    await expect(mapa.locator('.tonalidades button')).toHaveCount(12);
    await expect(mapa).toContainText('0 de 12');
    // desde Sol: Sol, Do, Fa…; Do concierto se lee Re en Si♭, por eso se busca por el nombre en concierto del botón
    await expect(mapa.getByRole('link', { name: /Tocar Hojas de otoño en/ })).toHaveAttribute('href', /p=u%3Ahoja&k=G$/);
    await mapa.locator('.tonalidades button[title="Concierto: G"]').click();
    await expect(mapa).toContainText('1 de 12');
    await expect(mapa.getByRole('link', { name: /Tocar Hojas de otoño en/ })).toHaveAttribute('href', /k=C$/); // sigue Do
    expect((await guardado(page))['u:hoja'].detalle['3'].keys).toEqual(['G']); // «La melodía»
    // desmarcar
    await mapa.locator('.tonalidades button[title="Concierto: G"]').click();
    await expect(mapa).toContainText('0 de 12');
    // el toque abre el tema en esa tonalidad
    await mapa.getByRole('link', { name: /Tocar Hojas de otoño en/ }).click();
    await expect(page).toHaveURL(/#\/playalong\?p=u%3Ahoja&k=G/);
  });

  test('en Hoy, el tema en estudio dice cuántas tonalidades lleva y cuál probar', async ({ page }) => {
    await conTema(page);
    await page.addInitScript(() => localStorage.setItem('harmonyjazz:temaestudio', JSON.stringify({ id: 'u:hoja' })));
    await page.goto('/#/hoy');
    const t = page.getByRole('region', { name: 'Tema en estudio' });
    await expect(t).toContainText('Tonalidades: 0 de 12');
    await t.getByRole('link', { name: /probá en/ }).click();
    await expect(page).toHaveURL(/#\/playalong\?p=u%3Ahoja&k=G/);
  });
});
