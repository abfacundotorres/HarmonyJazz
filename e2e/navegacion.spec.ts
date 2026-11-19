import { expect, openBlock, test } from './helpers';

const barra = (page: import('@playwright/test').Page) => page.getByRole('navigation', { name: 'Secciones' });

test.describe('navegación en cinco grupos', () => {
  test('la barra tiene cinco grupos y cada grupo abre su primera pantalla', async ({ page }) => {
    await page.goto('/#/hoy');
    await expect(barra(page).getByRole('link')).toHaveText(['Hoy', 'Estudiar', 'Tocar', 'Escuchar', 'Más']);
    await expect(barra(page).getByRole('link', { name: 'Hoy' })).toHaveAttribute('aria-current', 'page');
    await barra(page).getByRole('link', { name: 'Estudiar' }).click();
    await expect(page).toHaveURL(/#\/lecciones$/);
    await barra(page).getByRole('link', { name: 'Tocar' }).click();
    await expect(page).toHaveURL(/#\/playalong$/);
    await barra(page).getByRole('link', { name: 'Escuchar' }).click();
    await expect(page).toHaveURL(/#\/transcribir$/);
    await barra(page).getByRole('link', { name: 'Más' }).click();
    await expect(page).toHaveURL(/#\/mas$/);
  });

  test('las pantallas del grupo aparecen como sub-pestañas y el grupo recuerda la última que se vio', async ({ page }) => {
    await page.goto('/#/lecciones');
    const sub = page.getByRole('navigation', { name: 'Pantallas de Estudiar' });
    await expect(sub.getByRole('link')).toHaveText(['Lecciones', 'Escalas', 'Vocabulario']);
    await sub.getByRole('link', { name: 'Escalas' }).click();
    await expect(page.getByRole('heading', { name: 'Estudio de escalas' })).toBeVisible();
    await expect(barra(page).getByRole('link', { name: 'Estudiar' })).toHaveAttribute('aria-current', 'page');
    // se va a otro grupo y se vuelve: abre en Escalas, no en Lecciones
    await barra(page).getByRole('link', { name: 'Tocar' }).click();
    await expect(page.getByRole('navigation', { name: 'Pantallas de Tocar' }).getByRole('link')).toHaveText(['Play-along', 'Metrónomo']);
    await barra(page).getByRole('link', { name: 'Estudiar' }).click();
    await expect(page).toHaveURL(/#\/escalas$/);
  });

  test('los enlaces de siempre siguen funcionando y marcan su grupo', async ({ page }) => {
    for (const [ruta, grupo, titulo] of [
      ['#/vocabulario', 'Estudiar', 'Vocabulario'],
      ['#/escucha', 'Escuchar', 'Afinador y notas largas'],
      ['#/oido', 'Escuchar', 'Entrenamiento del oído'],
      ['#/progreso', 'Hoy', 'Tu progreso'],
      ['#/creditos', 'Más', 'Créditos y licencias'],
    ] as const) {
      await page.goto('/' + ruta);
      await expect(barra(page).getByRole('link', { name: grupo })).toHaveAttribute('aria-current', 'page');
      await expect(page.getByRole('heading', { name: titulo }).first()).toBeVisible();
    }
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
