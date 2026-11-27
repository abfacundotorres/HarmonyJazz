import { abrirMenu, expect, irA, openBlock, test } from './helpers';

const barra = (page: import('@playwright/test').Page) => page.getByRole('navigation', { name: 'Secciones' });

test.describe('menú de pantallas', () => {
  test('cerrado muestra sólo la pantalla actual; abierto lista las catorce, agrupadas', async ({ page }) => {
    await page.goto('/#/hoy');
    const boton = page.getByRole('button', { name: /\(menú de pantallas\)$/ });
    await expect(boton).toHaveText(/Plan/);
    await expect(boton).toHaveAttribute('aria-expanded', 'false');
    await expect(barra(page).getByRole('link')).toHaveCount(0);
    await boton.click();
    await expect(boton).toHaveAttribute('aria-expanded', 'true');
    await expect(barra(page).getByRole('link')).toHaveText([
      'Plan', 'Mi mes', 'Currícula', 'Progreso',
      'Lecciones', 'Escalas', 'Vocabulario',
      'Play-along', 'Temas', 'Metrónomo',
      'Transcribir', 'Oído', 'Afinador',
      'Ajustes', 'Créditos',
    ]);
    await expect(barra(page).getByRole('link', { name: 'Plan', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(barra(page).locator('.menutit')).toHaveText(['Hoy', 'Estudiar', 'Tocar', 'Escuchar', 'Más']);
  });

  test('elegir una pantalla la abre, cierra el menú y el botón pasa a mostrar su nombre', async ({ page }) => {
    await page.goto('/#/hoy');
    await irA(page, 'Escalas');
    await expect(page).toHaveURL(/#\/escalas$/);
    await expect(page.getByRole('heading', { name: 'Estudio de escalas' })).toBeVisible();
    await expect(barra(page).getByRole('link')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Escalas \(menú de pantallas\)$/ })).toHaveText(/Escalas/);
    // y no hay pestañas ni sub-pestañas
    await expect(page.getByRole('navigation', { name: /Pantallas de/ })).toHaveCount(0);
  });

  test('se cierra con Escape (y el foco vuelve al botón), tocando afuera y volviendo a tocar el botón', async ({ page }) => {
    await page.goto('/#/hoy');
    const boton = page.getByRole('button', { name: /\(menú de pantallas\)$/ });
    await boton.click();
    await expect(barra(page).getByRole('link').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(barra(page).getByRole('link')).toHaveCount(0);
    await expect(boton).toBeFocused();
    await boton.click();
    await page.mouse.click(200, 830); // abajo, fuera del panel
    await expect(barra(page).getByRole('link')).toHaveCount(0);
    await boton.click();
    await boton.click();
    await expect(barra(page).getByRole('link')).toHaveCount(0);
  });

  test('un enlace de siempre (de adentro de la app o guardado) abre su pantalla y el menú lo marca como actual', async ({ page }) => {
    for (const [ruta, actual, titulo] of [
      ['#/vocabulario', 'Vocabulario', 'Vocabulario'],
      ['#/escucha', 'Afinador', 'Afinador y notas largas'],
      ['#/oido', 'Oído', 'Entrenamiento del oído'],
      ['#/progreso', 'Progreso', 'Tu progreso'],
      ['#/creditos', 'Créditos', 'Créditos y licencias'],
    ] as const) {
      await page.goto('/' + ruta);
      await expect(page.getByRole('heading', { name: titulo }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: /\(menú de pantallas\)$/ })).toHaveText(new RegExp(actual));
      const menu = await abrirMenu(page);
      await expect(menu.getByRole('link', { name: actual, exact: true })).toHaveAttribute('aria-current', 'page');
    }
  });

  test('el panel cabe en el celular, también apaisado, y todos sus enlaces se pueden tocar', async ({ page }) => {
    await page.goto('/#/playalong');
    for (const tam of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(tam);
      const menu = await abrirMenu(page);
      const panel = menu.locator('.menupanel');
      const caja = (await panel.boundingBox())!;
      expect(caja.x).toBeGreaterThanOrEqual(0);
      expect(caja.x + caja.width).toBeLessThanOrEqual(tam.width + 1);
      expect(caja.y + caja.height).toBeLessThanOrEqual(tam.height + 1);
      // con poco alto el panel se desplaza adentro: el último enlace se alcanza
      await menu.getByRole('link', { name: 'Créditos', exact: true }).scrollIntoViewIfNeeded();
      await expect(menu.getByRole('link', { name: 'Créditos', exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
    }
  });

  test('el volumen arranca en −4 dB y no pasa de 0 dB: con más, los acordes saturan en el altavoz del celular', async ({ page }) => {
    await page.goto('/#/mas');
    const vol = page.getByLabel(/Volumen/);
    await expect(vol).toHaveValue('-4');
    await expect(vol).toHaveAttribute('max', '0');
    // un volumen guardado por encima del techo (de una versión anterior) se lleva a 0 dB
    await page.evaluate(() => localStorage.setItem('harmonyjazz:settings', JSON.stringify({ volume: 2 })));
    await page.reload();
    await expect(page.getByLabel(/Volumen/)).toHaveValue('0');
  });

  test('Más reúne apariencia, sonido y copia de seguridad, y los ajustes se recuerdan', async ({ page }) => {
    await page.goto('/#/mas');
    await expect(page.getByRole('heading', { name: 'Apariencia' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Copia de seguridad' })).toBeVisible();
    await page.getByLabel('Salida').selectOption('normal');
    await page.getByLabel('Estilo de cifrado').selectOption('full');
    await page.getByLabel(/Volumen/).fill('-6');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:settings')!))).toMatchObject({ output: 'normal', chordStyle: 'full', volume: -6 });
    await page.reload();
    await expect(page.getByLabel('Salida')).toHaveValue('normal');
    await expect(page.getByLabel(/Volumen/)).toHaveValue('-6');
    // y Hoy ya no trae el selector de tema ni la copia
    await page.goto('/#/hoy');
    await expect(page.getByRole('heading', { name: 'Apariencia' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Copia de seguridad' })).toHaveCount(0);
  });
});

test.describe('pantallas más cortas', () => {
  test('Hoy: tres bloques, el primero abierto, sin casilleros ni temporizador', async ({ page }) => {
    await page.goto('/#/hoy');
    const heads = page.locator('article.block .bhead');
    await expect(heads).toHaveCount(3);
    await expect(heads.nth(0)).toHaveAttribute('aria-expanded', 'true');
    await expect(heads.nth(1)).toHaveAttribute('aria-expanded', 'false');
    await expect(heads.nth(2)).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('article.block input[type=checkbox]')).toHaveCount(0);
    // al abrir un bloque se ve su detalle y su enlace, sin temporizador
    const b = await openBlock(page, 'Tema de la semana');
    await expect(b.getByRole('link', { name: /Abrir play-along/ })).toBeVisible();
    await expect(b.getByRole('button', { name: /temporizador/ })).toHaveCount(0);
    // con todo plegado cabe en una pantalla y media de celular
    await heads.nth(0).click();
    await heads.nth(2).click();
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThan(1500);
  });

  test('Lecciones: secciones y ejercicios plegados, los ejercicios arman la partitura recién al abrirlos', async ({ page }) => {
    await page.goto('/#/lecciones/guide-tones');
    await expect(page.locator('#ex-0')).toBeVisible();
    await expect(page.locator('details.fold[open]')).toHaveCount(0);
    expect(await page.locator('details.fold[id^="ex-"]').count()).toBeGreaterThanOrEqual(5);
    // nada pesado en la página mientras están plegados
    await expect(page.locator('.paper svg')).toHaveCount(0);
    await expect(page.locator('.player')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThan(1700);
    // cada ejercicio muestra su tempo y en cuántas tonalidades lo marcaste
    await expect(page.locator('#ex-0 > summary')).toContainText(/♩ \d+ · 0\/12 tonalidades/);
    await page.locator('#ex-1 > summary').click();
    await expect(page.locator('#ex-1 .paper svg')).toBeVisible();
    await expect(page.locator('#ex-1 .player')).toBeVisible();
    await expect(page.locator('#ex-0 .paper')).toHaveCount(0);
    // y se pliega de nuevo
    await page.locator('#ex-1 > summary').click();
    await expect(page.locator('#ex-1 .paper')).toHaveCount(0);
  });

  test('un enlace con ?ex= abre ese ejercicio en esa tonalidad y lo deja a la vista', async ({ page }) => {
    await page.goto('/#/lecciones/guide-tones?k=Eb&ex=2');
    await expect(page.locator('#ex-2[open]')).toBeVisible();
    await expect(page.locator('#ex-2 .keys button[aria-checked="true"]')).toContainText(/E♭|Eb|F|G/);
    await expect(page.locator('#ex-2 > summary')).toBeInViewport();
    await expect(page.locator('details.fold[open]')).toHaveCount(1);
  });

  test('desde Progreso, un repaso abre el ejercicio exacto de la lección', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('harmonyjazz:mastery', JSON.stringify({ 'guide-tones:3': { F: 100 } }));
    });
    await page.goto('/#/progreso');
    await page.locator('#repaso .reviewlist li').first().getByRole('link').click();
    await expect(page).toHaveURL(/#\/lecciones\/guide-tones\?k=F&ex=3/);
    await expect(page.locator('#ex-3[open]')).toBeVisible();
  });
});
