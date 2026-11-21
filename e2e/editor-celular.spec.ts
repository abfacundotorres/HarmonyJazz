import { expect, test } from './helpers';
import type { Page } from '@playwright/test';

// Cargar un tema en el celular (390 px): nada fijo tapando sin necesidad, el teclado sin desplazamiento lateral, lo poco usado plegado y el
// formulario compacto. Con ancho (compu) todo sigue a la vista.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const abrir = async (page: Page) => {
  await page.goto('/#/playalong');
  if (!(await page.locator('.library > details[open]').count())) await page.getByText(/Mis temas/).first().click();
  await expect(page.locator('.ced-grid')).toBeVisible();
};
const raiz = (page: Page) => page.getByRole('group', { name: 'Raíz' });
const calidad = (page: Page) => page.getByRole('group', { name: 'Calidad' });
const posicion = (page: Page, sel: string) => page.locator(sel).evaluate((e) => getComputedStyle(e).position);

test.describe('cargar un tema en el celular', () => {
  test('el visor de libro no queda fijo si está cerrado o vacío, sólo con un libro abierto', async ({ page }) => {
    await abrir(page);
    expect(await posicion(page, 'details.visor')).toBe('static'); // cerrado
    await page.getByText(/Mi libro \(PDF o foto\)/).click();
    expect(await posicion(page, 'details.visor')).toBe('static'); // abierto pero sin libro
    await page.locator('input[aria-label="Archivo del libro"]').setInputFiles({ name: 'pagina.png', mimeType: 'image/png', buffer: PNG });
    await expect(page.getByRole('img', { name: 'Página de tu libro' })).toBeVisible();
    expect(await posicion(page, 'details.visor')).toBe('sticky'); // con libro
    await page.getByText(/Mi libro \(PDF o foto\)/).click(); // lo cierra: vuelve a no tapar
    await expect(page.locator('details.visor')).not.toHaveAttribute('open', '');
    await expect.poll(() => posicion(page, 'details.visor')).toBe('static');
    // el título es un renglón común (no dos columnas)
    const alto = await page.locator('details.visor > summary').evaluate((e) => e.getBoundingClientRect().height);
    expect(alto).toBeLessThan(90);
  });

  test('el teclado no se desplaza hacia el costado: raíces en 2 filas y calidades de a cinco con «Más»', async ({ page }) => {
    await abrir(page);
    const sinLateral = await page.locator('.ced-keypad .ced-pal').evaluateAll((l) => l.map((e) => e.scrollWidth <= e.clientWidth));
    expect(sinLateral).toEqual([true, true]);
    await expect(raiz(page).getByRole('button')).toHaveCount(12);
    const filasRaiz = await raiz(page).getByRole('button').evaluateAll((b) => new Set(b.map((e) => Math.round(e.getBoundingClientRect().top))).size);
    expect(filasRaiz).toBe(2);
    // las nueve de uso diario y «Más»; el resto no se ve hasta tocarlo
    const visibles = () => calidad(page).getByRole('button').evaluateAll((b) => b.filter((e) => (e as HTMLElement).offsetParent !== null).map((e) => e.textContent));
    expect(await visibles()).toEqual(['maj7', 'm7', '7', 'm7♭5', 'dim7', '6', 'm6', '7alt', '7♭9', 'Más ▾']);
    await calidad(page).getByRole('button', { name: 'Más ▾' }).click();
    expect((await visibles()).length).toBe(17); // las 16 calidades y «Menos»
    // una calidad de las escondidas se puede poner
    await page.locator('.ced-bar:not(.add)').first().click();
    await raiz(page).getByRole('button', { name: 'F', exact: true }).click();
    await calidad(page).getByRole('button', { name: '7sus', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Compás 1: F7sus' })).toBeVisible();
    await calidad(page).getByRole('button', { name: 'Menos ▴' }).click();
    expect((await visibles()).length).toBe(10);
  });

  test('el teclado se pliega con ⌨ y deja el casillero del acorde', async ({ page }) => {
    await abrir(page);
    await expect(raiz(page)).toBeVisible();
    await page.getByRole('button', { name: 'Mostrar u ocultar el teclado de acordes' }).click();
    await expect(raiz(page)).toHaveCount(0);
    await expect(calidad(page)).toHaveCount(0);
    await expect(page.getByLabel('Acorde 1 del compás 1')).toBeVisible(); // se puede escribir igual
    const alto = await page.locator('.ced-keypad').evaluate((e) => e.getBoundingClientRect().height);
    expect(alto).toBeLessThan(90);
    await page.getByRole('button', { name: 'Mostrar u ocultar el teclado de acordes' }).click();
    await expect(raiz(page)).toBeVisible();
  });

  test('la fila del acorde entra en un renglón y el teclado completo no pasa de un tercio de la pantalla', async ({ page }) => {
    await abrir(page);
    const m = await page.evaluate(() => {
      const k = document.querySelector('.ced-keypad')!.getBoundingClientRect();
      // por el centro vertical (los elementos tienen alturas distintas y quedan centrados en el renglón)
      const filas = new Set([...document.querySelectorAll('.ced-keypad .ced-slots > *')].map((e) => { const r = e.getBoundingClientRect(); return Math.round((r.top + r.height / 2) / 12); }));
      return { alto: k.height, filas: filas.size, desborde: document.documentElement.scrollWidth <= window.innerWidth };
    });
    expect(m.filas).toBe(1);
    expect(m.alto).toBeLessThanOrEqual(844 / 3);
    expect(m.desborde).toBe(true);
  });

  test('secciones, repeticiones y rango están plegados en el celular y se abren con un toque', async ({ page }) => {
    await abrir(page);
    const det = page.locator('details.ced-mas');
    await expect(det).not.toHaveAttribute('open', '');
    await expect(page.getByRole('button', { name: 'Elegir rango' })).toBeHidden();
    await expect(page.getByLabel('Tipo de compás')).toBeVisible(); // lo de todos los días queda a la vista
    await expect(page.getByRole('button', { name: 'Agregar acorde al compás' })).toBeVisible();
    await det.locator('summary').click();
    await expect(page.getByRole('button', { name: 'Elegir rango' })).toBeVisible();
    await page.getByLabel('Sección').selectOption('A');
    await expect(page.locator('.ced-bar:not(.add)').first().locator('.ced-sec')).toHaveText('A');
  });

  test('el formulario va de a dos: tonalidad con modo y tempo con estilo', async ({ page }) => {
    await abrir(page);
    // los campos del formulario, en orden: nombre, compositor, tonalidad, modo, tempo, estilo
    const tops = await page.locator('.formgrid > label').evaluateAll((l) => l.map((e) => Math.round(e.getBoundingClientRect().top)));
    const [, , t, m, tempo, est] = tops;
    expect(Math.abs(t - m)).toBeLessThan(6);
    expect(Math.abs(tempo - est)).toBeLessThan(6);
    expect(tempo).toBeGreaterThan(t);
    // y se explica qué es la tonalidad
    await expect(page.locator('.library p', { hasText: 'Tonalidad: la del cifrado' })).toContainText('la del cifrado que escribís (en concierto)');
  });

  test('«＋ Cargar un tema» abre la sección y la deja a la vista', async ({ page }) => {
    await page.goto('/#/playalong');
    await expect(page.locator('.library > details')).not.toHaveAttribute('open', '');
    await page.getByRole('button', { name: '＋ Cargar un tema' }).click();
    await expect(page.locator('.library > details')).toHaveAttribute('open', '');
    await expect.poll(async () => (await page.getByLabel('Nombre').boundingBox())?.y ?? -1, { timeout: 10_000 }).toBeGreaterThan(0);
    await expect.poll(async () => ((await page.getByLabel('Nombre').boundingBox())?.y ?? 9999) < 844).toBe(true);
    // un segundo toque con la sección ya abierta también la lleva a la vista
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByRole('button', { name: '＋ Cargar un tema' }).click();
    await expect.poll(async () => ((await page.getByLabel('Nombre').boundingBox())?.y ?? 9999) < 844, { timeout: 10_000 }).toBe(true);
  });
});

test.describe('cargar un tema con ancho', () => {
  test('en la compu todo se ve: las 16 calidades, sin «Más», y el panel abierto', async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 800 });
    await abrir(page);
    await expect(calidad(page).getByRole('button', { name: 'Más ▾' })).toBeHidden();
    const visibles = await calidad(page).getByRole('button').evaluateAll((b) => b.filter((e) => (e as HTMLElement).offsetParent !== null).length);
    expect(visibles).toBe(16);
    await expect(page.locator('details.ced-mas')).toHaveAttribute('open', '');
    await expect(page.getByRole('button', { name: 'Elegir rango' })).toBeVisible();
    expect(await page.locator('.ced-keypad .ced-pal').evaluateAll((l) => l.every((e) => e.scrollWidth <= e.clientWidth))).toBe(true);
  });
});
