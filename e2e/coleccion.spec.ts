import { expect, test } from './helpers';
import type { Page } from '@playwright/test';

// Mi colección: un JSON con muchos temas (estilo iReal Pro), elegido una vez, buscado y agregado a Mis temas. La colección de la prueba está
// inventada (1503 temas de relleno y tres temas con forma conocida): no hay nada de ninguna colección real.
const FINALES = {
  Title: 'Tema con finales', Composer: 'Autor Uno', Key: 'F', Rhythm: 'Medium Swing', TimeSignature: '4/4',
  Sections: [
    { Label: 'A', MainSegment: { Chords: 'Dm7|G7|Cmaj7|A7' }, Endings: [{ Chords: 'Dm7,G7|Cmaj7' }, { Chords: 'Dm7|Cmaj7,A7' }] },
    { Label: 'B', MainSegment: { Chords: 'Fmaj7|Bb7|Gm7|C7' } },
  ],
};
const VALS = { Title: 'Vals de prueba', Composer: 'Autor Dos', Key: 'Dmin', Rhythm: 'Waltz', TimeSignature: '3/4', Sections: [{ Label: 'A', MainSegment: { Chords: 'Dm7|G7|Cmaj7|Cmaj7' } }] };
const CINCO = { Title: 'Tema en cinco cuartos', Composer: 'Autor Tres', Key: 'C', Rhythm: 'Medium Swing', TimeSignature: '5/4', Sections: [{ Label: 'A', MainSegment: { Chords: 'C|F' } }] };
const ARBOL = { Title: 'Árbol de otoño', Composer: 'Ñandú Pérez', Key: 'G', Rhythm: 'Ballad', TimeSignature: '4/4', Sections: [{ Label: 'A', MainSegment: { Chords: 'Gmaj7|Em7|Am7|D7' } }] };
const relleno = Array.from({ length: 1500 }, (_, i) => ({
  Title: `Relleno ${String(i).padStart(4, '0')}`, Composer: 'Relleno', Key: 'Bb', Rhythm: 'Medium Swing', TimeSignature: '4/4',
  Sections: [{ Label: 'A', MainSegment: { Chords: 'Bbmaj7|Gm7|Cm7|F7' } }],
}));
const COLECCION = Buffer.from(JSON.stringify([FINALES, VALS, CINCO, ARBOL, ...relleno]));

const abrir = async (page: Page) => {
  await page.goto('/#/repertorio');
  await page.waitForSelector('.player');
  if (!(await page.locator('details.coleccion[open]').count())) await page.getByText('Mi colección (archivo JSON)').click();
};
const subir = (page: Page, buffer: Buffer = COLECCION, name = 'mis-temas.txt', mimeType = 'text/plain') =>
  page.locator('input[aria-label="Archivo de la colección"]').setInputFiles({ name, mimeType, buffer });
const fila = (page: Page, titulo: string) => page.locator('.colecc-lista li', { hasText: titulo });
const biblioteca = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:library') ?? '{"tunes":[]}').tunes as { name: string; composer: string; key: string | null; mode: string; chart: string; style: string; tempo: number; doc?: { bars: { chords: string[]; section?: string; repeatStart?: boolean; ending?: number }[] } }[]);

test.describe('mi colección', () => {
  test('sin archivo explica qué hacer; al elegirlo muestra cuántos temas hay y una primera página, con «Ver más»', async ({ page }) => {
    await abrir(page);
    await expect(page.getByRole('button', { name: 'Elegir archivo…' })).toBeVisible();
    await expect(page.locator('details.coleccion').getByText(/no se sube a ningún lado/)).toBeVisible();
    await subir(page); // la extensión .txt (como llega por WhatsApp) también sirve
    await expect(page.getByText('«mis-temas.txt» · 1504 temas')).toBeVisible();
    await expect(page.locator('.colecc-lista li')).toHaveCount(30);
    await page.getByRole('button', { name: /^Ver más \(1474\)/ }).click();
    await expect(page.locator('.colecc-lista li')).toHaveCount(60);
  });

  test('se busca por título o compositor, sin importar mayúsculas ni acentos, y rápido aunque haya 1500 temas', async ({ page }) => {
    await abrir(page);
    await subir(page);
    const buscar = page.getByLabel('Buscar', { exact: true });
    await buscar.fill('arbol');
    await expect(page.locator('.colecc-lista li')).toHaveCount(1);
    await expect(fila(page, 'Árbol de otoño')).toContainText('Ñandú Pérez');
    await expect(page.getByText('1 de 1504 temas')).toBeVisible();
    await buscar.fill('PEREZ'); // por compositor
    await expect(page.locator('.colecc-lista li')).toHaveCount(1);
    await buscar.fill('relleno 07');
    // cada palabra puede estar en cualquier parte del título («0107», «0170»…): la cuenta esperada sale con la misma regla
    const esperados = relleno.filter((t) => t.Title.toLowerCase().includes('07')).length;
    expect(esperados).toBeGreaterThan(30);
    await expect(page.locator('.colecc-lista li')).toHaveCount(30); // se muestran de a 30
    await expect(page.getByText(`${esperados} de 1504 temas`)).toBeVisible();
    await buscar.fill('zzzz');
    await expect(page.locator('.colecc-lista li')).toHaveCount(0);
    await buscar.fill('');
    await expect(page.getByText('1504 temas', { exact: true })).toBeVisible();
  });

  test('«Agregar» lo pasa a Mis temas con su grilla (secciones, repeticiones y finales) y avisa lo que se aproximó', async ({ page }) => {
    await abrir(page);
    await subir(page);
    await page.getByLabel('Buscar', { exact: true }).fill('con finales');
    await page.getByRole('button', { name: 'Agregar Tema con finales a Mis temas' }).click();
    const aviso = page.locator('.colecc-ok');
    await expect(aviso).toContainText('«Tema con finales» agregado a Mis temas');
    await expect(aviso).toContainText('16 compases');
    await expect(aviso).toContainText('El tempo no viene en la colección');
    const t = (await biblioteca(page))[0];
    expect(t).toMatchObject({ name: 'Tema con finales', composer: 'Autor Uno', key: 'F', mode: 'major', style: 'swing', tempo: 130 });
    expect(t.chart.split('|')).toHaveLength(16);
    expect(t.doc!.bars).toHaveLength(12);
    expect(t.doc!.bars[0]).toMatchObject({ section: 'A', repeatStart: true });
    expect(t.doc!.bars.map((b) => b.ending).filter(Boolean)).toEqual([1, 1, 2, 2]);
    // ya no se puede agregar dos veces
    await expect(fila(page, 'Tema con finales')).toContainText('ya en Mis temas');
    await expect(page.getByRole('button', { name: 'Agregar Tema con finales a Mis temas' })).toHaveCount(0);
    expect(await biblioteca(page)).toHaveLength(1);
  });

  test('«Agregar y tocar» lo deja elegido en el Play-along con su grilla', async ({ page }) => {
    await abrir(page);
    await subir(page);
    await page.getByLabel('Buscar', { exact: true }).fill('vals de prueba');
    await page.getByRole('button', { name: 'Agregar Vals de prueba y tocar' }).click();
    await expect(page.locator('.colecc-ok')).toContainText('listo para tocar');
    await expect(page).toHaveURL(/#\/playalong\?p=u%3A/);
    await expect(page.getByLabel('Tema', { exact: true })).toHaveValue(/^u:/);
    await expect(page.locator('.board .bar')).toHaveCount(4);
    const t = (await biblioteca(page))[0];
    expect(t).toMatchObject({ name: 'Vals de prueba', key: 'D', mode: 'minor', style: 'swing' });
    expect(t.chart.startsWith('@3/4 ')).toBe(true);
    // «Tocar» sobre un tema que ya está lo elige de nuevo
    await page.getByLabel('Buscar', { exact: true }).fill('árbol');
    await page.getByRole('button', { name: 'Agregar Árbol de otoño a Mis temas' }).click();
    await page.getByLabel('Buscar', { exact: true }).fill('vals');
    await page.getByRole('button', { name: 'Tocar Vals de prueba' }).click();
    await expect(page.getByLabel('Tema', { exact: true })).toHaveValue((await biblioteca(page))[0] ? /^u:/ : '');
  });

  test('un tema que no se puede convertir (compás 5/4) explica por qué y no agrega nada', async ({ page }) => {
    await abrir(page);
    await subir(page);
    await page.getByLabel('Buscar', { exact: true }).fill('cinco cuartos');
    await page.getByRole('button', { name: 'Agregar Tema en cinco cuartos a Mis temas' }).click();
    await expect(page.getByText(/No se pudo agregar «Tema en cinco cuartos»: El compás 5\/4 no está disponible/)).toBeVisible();
    expect(await biblioteca(page)).toHaveLength(0);
  });

  test('la colección queda guardada: al volver se abre sola y «Quitar la colección» la borra', async ({ page }) => {
    test.setTimeout(60_000);
    await abrir(page);
    await subir(page);
    await expect(page.getByText('1504 temas').first()).toBeVisible();
    await page.reload();
    await page.waitForSelector('.player');
    await expect(page.getByText('«mis-temas.txt» · 1504 temas')).toBeVisible({ timeout: 15_000 }); // se abrió sola
    await page.getByRole('button', { name: 'Quitar la colección' }).click();
    await expect(page.getByRole('button', { name: 'Elegir archivo…' })).toBeVisible();
    await page.reload();
    await page.waitForSelector('.player');
    await page.getByText('Mi colección (archivo JSON)').click();
    await expect(page.getByRole('button', { name: 'Elegir archivo…' })).toBeVisible();
  });

  test('un archivo que no es una colección se rechaza con un motivo', async ({ page }) => {
    await abrir(page);
    await subir(page, Buffer.from('esto no es json'), 'nada.txt');
    await expect(page.getByRole('alert')).toContainText('JSON válido');
    await subir(page, Buffer.from('{"a":1}'), 'otro.json', 'application/json');
    await expect(page.getByRole('alert')).toContainText('lista de temas');
    await subir(page, Buffer.from('[{"nada":1}]'), 'vacio.json', 'application/json');
    await expect(page.getByRole('alert')).toContainText('no parece una colección');
    await expect(page.getByRole('button', { name: 'Elegir archivo…' })).toBeVisible();
  });

  test('respeta el máximo de Mis temas', async ({ page }) => {
    await page.addInitScript(() => {
      const tunes = Array.from({ length: 500 }, (_, i) => ({ id: `u:t${String(i).padStart(4, '0')}`, name: `Mío ${i}`, composer: '', key: null, mode: 'major', chart: 'C | F', tempo: 120, style: 'swing' }));
      localStorage.setItem('harmonyjazz:library', JSON.stringify({ tunes }));
    });
    await abrir(page);
    await subir(page);
    await page.getByLabel('Buscar', { exact: true }).fill('árbol');
    await page.getByRole('button', { name: 'Agregar Árbol de otoño a Mis temas' }).click();
    await expect(page.getByText(/Llegaste al máximo de 500 temas/)).toBeVisible();
    expect(await biblioteca(page)).toHaveLength(500);
  });

  test('en el celular la lista no desborda y los botones se tocan', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await abrir(page);
    await subir(page);
    const m = await page.evaluate(() => ({ desborde: document.documentElement.scrollWidth <= window.innerWidth, botones: [...document.querySelectorAll('.colecc-lista button')].every((b) => b.getBoundingClientRect().height >= 40) }));
    expect(m).toEqual({ desborde: true, botones: true });
  });
});
