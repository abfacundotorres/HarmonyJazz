import { expect, test } from './helpers';
import type { Page } from '@playwright/test';

// Visor de mi libro (PDF o foto) junto al editor de temas. El PDF se arma acá mismo (una página de texto grande por hoja) para
// comprobar que de verdad se dibuja: pdf.js, su worker y la política de seguridad del build tienen que llevarse bien.
function pdf(paginas: string[]): Buffer {
  const objs: string[] = [];
  const n = paginas.length;
  objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objs[2] = `<< /Type /Pages /Kids [${paginas.map((_, i) => `${4 + i * 2} 0 R`).join(' ')}] /Count ${n} >>`;
  objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';
  paginas.forEach((t, i) => {
    const c = `BT /F1 72 Tf 50 400 Td (${t}) Tj ET`;
    objs[4 + i * 2] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`;
    objs[5 + i * 2] = `<< /Length ${c.length} >>\nstream\n${c}\nendstream`;
  });
  let out = '%PDF-1.4\n';
  const offs: number[] = [];
  for (let i = 1; i < objs.length; i++) {
    offs[i] = out.length;
    out += `${i} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const x = out.length;
  out += `xref\n0 ${objs.length}\n0000000000 65535 f \n${offs.slice(1).map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`;
  return Buffer.from(out, 'latin1');
}
const LIBRO = pdf(['One', 'Two Two Two', 'Three Three Three']);
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

const abrir = async (page: Page) => {
  await page.goto('/#/playalong');
  // sin volver a cerrar lo que ya está abierto (la pantalla puede seguir abierta de una vuelta anterior)
  if (!(await page.locator('.library > details[open]').count())) await page.getByText(/Mis temas/).first().click();
  if (!(await page.locator('details.visor[open]').count())) await page.getByText(/Mi libro \(PDF o foto\)/).click();
};
const archivo = (page: Page) => page.locator('input[aria-label="Archivo del libro"]');
const hoja = (page: Page, n: number) => page.locator(`canvas[data-listo="1"][data-pagina="${n}"]`);
/** Cuántos píxeles oscuros tiene la página dibujada (una página en blanco da 0). */
const oscuros = (page: Page) =>
  page.locator('canvas[data-listo="1"]').evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] < 100 && d[i + 1] < 100 && d[i + 2] < 100 && d[i + 3] > 0) n++;
    return n;
  });
const subir = (page: Page, buffer: Buffer, name = 'Mi libro.pdf', mimeType = 'application/pdf') => archivo(page).setInputFiles({ name, mimeType, buffer });

test.describe('visor de mi libro', () => {
  test('sin libro explica qué hacer y ofrece abrirlo', async ({ page }) => {
    await abrir(page);
    await expect(page.getByRole('button', { name: 'Abrir mi libro…' })).toBeVisible();
    await expect(page.getByText(/no se sube a ningún lado/).first()).toBeVisible();
    // el editor de temas sigue ahí, debajo o al lado
    await expect(page.getByLabel('Nombre')).toBeVisible();
  });

  test('abrir y cerrar el visor no cierra la sección «Mis temas»', async ({ page }) => {
    await abrir(page);
    const afuera = page.locator('.library > details');
    const visor = page.locator('details.visor');
    await expect(afuera).toHaveAttribute('open', '');
    await expect(visor).toHaveAttribute('open', '');
    await page.getByText(/Mi libro \(PDF o foto\)/).click(); // lo cierra
    await expect(visor).not.toHaveAttribute('open', '');
    await expect(afuera).toHaveAttribute('open', ''); // la sección sigue abierta
    await expect(page.getByLabel('Nombre')).toBeVisible();
    await page.getByText(/Mi libro \(PDF o foto\)/).click(); // lo abre
    await expect(visor).toHaveAttribute('open', '');
    await expect(afuera).toHaveAttribute('open', '');
  });

  test('un PDF se dibuja de verdad; se pasa de página, se escribe el número, se acerca, se ajusta y se gira', async ({ page }) => {
    test.setTimeout(60_000);
    await abrir(page);
    await subir(page, LIBRO);
    await expect(hoja(page, 1)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel('Número de página')).toHaveValue('1');
    await expect(page.locator('.visor-pag')).toContainText('de 3');
    const p1 = await oscuros(page);
    expect(p1, 'la página 1 no está en blanco').toBeGreaterThan(200);

    await page.getByRole('button', { name: 'Página siguiente' }).click();
    await expect(hoja(page, 2)).toBeVisible({ timeout: 15_000 });
    const p2 = await oscuros(page);
    expect(p2).toBeGreaterThan(p1); // «Two Two Two» tiene más tinta que «One»
    await expect(page.getByRole('button', { name: 'Página anterior' })).toBeEnabled();

    // escribir el número de página (y pasarse del total lo deja en la última)
    await page.getByLabel('Número de página').fill('99');
    await page.getByLabel('Número de página').press('Enter');
    await expect(hoja(page, 3)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByLabel('Número de página')).toHaveValue('3');
    await expect(page.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();

    // zoom
    const ancho = async () => (await page.locator('canvas[data-listo="1"]').boundingBox())!.width;
    const w1 = await ancho();
    await page.getByRole('button', { name: 'Acercar' }).click();
    await expect(page.getByLabel('Zoom')).toHaveText('125%');
    await expect.poll(ancho, { timeout: 15_000 }).toBeGreaterThan(w1 * 1.2);
    await page.getByRole('button', { name: 'Ancho', exact: true }).click();
    await expect(page.getByLabel('Zoom')).toHaveText('100%');
    await expect.poll(ancho, { timeout: 15_000 }).toBeLessThan(w1 * 1.05);

    // página completa: baja el zoom si la hoja es más alta que el recuadro
    await page.getByRole('button', { name: 'Página', exact: true }).click();
    const z = await page.getByLabel('Zoom').innerText();
    expect(Number(z.replace('%', ''))).toBeLessThanOrEqual(100);

    // girar: una hoja vertical pasa a horizontal
    await page.getByRole('button', { name: 'Ancho', exact: true }).click();
    await expect.poll(async () => { const b = await page.locator('canvas[data-listo="1"]').boundingBox(); return b ? b.height > b.width : null; }).toBe(true);
    await page.getByRole('button', { name: 'Girar la página' }).click();
    await expect.poll(async () => { const b = await page.locator('canvas[data-listo="1"]').boundingBox(); return b ? b.width > b.height : null; }, { timeout: 15_000 }).toBe(true);
  });

  test('el libro y la página se recuerdan al volver; «Quitar» lo borra', async ({ page }) => {
    test.setTimeout(60_000);
    await abrir(page);
    await subir(page, LIBRO, 'Mis hojas.pdf');
    await expect(hoja(page, 1)).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Página siguiente' }).click();
    await expect(hoja(page, 2)).toBeVisible({ timeout: 15_000 });
    await page.reload();
    await page.getByText(/Mis temas/).first().click();
    // se abre solo, en la misma página
    await expect(hoja(page, 2)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel('Número de página')).toHaveValue('2');
    await expect(page.getByRole('region', { name: 'Página de Mis hojas.pdf' })).toBeVisible();
    await page.getByRole('button', { name: 'Quitar', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Abrir mi libro…' })).toBeVisible();
    await page.reload();
    await page.getByText(/Mis temas/).first().click();
    // sin libro el visor arranca cerrado
    await expect(page.locator('details.visor')).not.toHaveAttribute('open', '');
    await page.getByText(/Mi libro \(PDF o foto\)/).click();
    await expect(page.getByRole('button', { name: 'Abrir mi libro…' })).toBeVisible();
    await expect(page.locator('canvas[data-listo="1"]')).toHaveCount(0);
  });

  test('un archivo que no es PDF ni foto, vacío o dañado se rechaza con un motivo y no rompe nada', async ({ page }) => {
    test.setTimeout(60_000);
    await abrir(page);
    await subir(page, Buffer.from('hola'), 'notas.txt', 'text/plain');
    await expect(page.getByRole('alert')).toContainText('Elegí un PDF o una foto');
    await subir(page, Buffer.alloc(0), 'vacio.pdf');
    await expect(page.getByRole('alert')).toContainText('vacío');
    await subir(page, Buffer.from('%PDF-1.4\nesto no es un pdf de verdad'), 'roto.pdf');
    await expect(page.getByRole('alert')).toContainText(/no es un PDF válido|No se pudo abrir/, { timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'Abrir mi libro…' })).toBeVisible();
    await expect(page.getByLabel('Nombre')).toBeVisible();
  });

  test('una foto también se abre, y el zoom la agranda', async ({ page }) => {
    await abrir(page);
    await subir(page, PNG, 'pagina.png', 'image/png');
    const img = page.getByRole('img', { name: 'Página de tu libro' });
    await expect(img).toBeVisible();
    await expect(page.getByLabel('Número de página')).toHaveCount(0); // una foto no tiene páginas
    const w1 = (await img.boundingBox())!.width;
    await page.getByRole('button', { name: 'Acercar' }).click();
    await expect.poll(async () => (await img.boundingBox())!.width).toBeGreaterThan(w1 * 1.2);
  });

  test('en vertical el visor queda fijo arriba del editor y no hay desborde', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await abrir(page);
    await subir(page, PNG, 'pagina.png', 'image/png');
    await expect(page.getByRole('img', { name: 'Página de tu libro' })).toBeVisible();
    const m = await page.evaluate(() => {
      const v = document.querySelector('.cargar > .visor')!.getBoundingClientRect();
      const f = document.querySelector('.cargar-form')!.getBoundingClientRect();
      return { arriba: v.bottom <= f.top + 1, pos: getComputedStyle(document.querySelector('.cargar > .visor')!).position, desborde: document.documentElement.scrollWidth <= window.innerWidth };
    });
    expect(m.arriba).toBe(true);
    expect(m.pos).toBe('sticky');
    expect(m.desborde).toBe(true);
    // la altura se cambia de a tres pasos
    const alto = () => page.locator('.visor-caja').evaluate((e) => e.getBoundingClientRect().height);
    const h0 = await alto();
    await page.getByRole('button', { name: 'Cambiar la altura del visor' }).click();
    await expect.poll(alto).not.toBe(h0);
  });

  test('con ancho (compu o celular apaisado) el visor va a la izquierda y el editor a la derecha', async ({ page }) => {
    for (const t of [{ width: 1100, height: 800 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(t);
      await abrir(page);
      await subir(page, PNG, 'pagina.png', 'image/png');
      await expect(page.getByRole('img', { name: 'Página de tu libro' })).toBeVisible();
      const m = await page.evaluate(() => {
        const v = document.querySelector('.cargar > .visor')!.getBoundingClientRect();
        const f = document.querySelector('.cargar-form')!.getBoundingClientRect();
        return { izq: v.right <= f.left + 1, mismoRenglon: Math.abs(v.top - f.top) < 40, desborde: document.documentElement.scrollWidth <= window.innerWidth };
      });
      expect(m, `${t.width}×${t.height}`).toEqual({ izq: true, mismoRenglon: true, desborde: true });
    }
  });
});
