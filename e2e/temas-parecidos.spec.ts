import { abrirEstudio, expect, test } from './helpers';
import type { Page } from '@playwright/test';

// Temas de mi colección con esta armonía: la colección de la prueba está inventada (1500 temas de relleno sin ii–V–I y dos con armonía conocida).
const GEMELO = { Title: 'Armonía gemela', Composer: 'Autor Uno', Key: 'D', Rhythm: 'Medium Swing', TimeSignature: '4/4', Sections: [{ Label: 'A', MainSegment: { Chords: 'Em7|A7|Dmaj7|Dmaj7' } }] };
const CERCANO = { Title: 'Cercano de otro estilo', Composer: 'Autor Dos', Key: 'F', Rhythm: 'Ballad', TimeSignature: '4/4', Sections: [{ Label: 'A', MainSegment: { Chords: 'Gm7|C7|Fmaj7|D7' } }] };
const relleno = Array.from({ length: 1500 }, (_, i) => ({
  Title: `Relleno ${String(i).padStart(4, '0')}`, Composer: 'Relleno', Key: 'Eb', Rhythm: 'Medium Swing', TimeSignature: '4/4',
  Sections: [{ Label: 'A', MainSegment: { Chords: 'Ebmaj7|Cm7|Ebmaj7|Cm7' } }],
}));
const COLECCION = Buffer.from(JSON.stringify([CERCANO, ...relleno, GEMELO]));

const ir = async (page: Page) => {
  await page.goto('/#/playalong?p=ii-v-i');
  await page.waitForSelector('.board');
};
const abrirParecidos = async (page: Page) => {
  await abrirEstudio(page);
  await page.getByText('Temas de mi colección con esta armonía').click();
};

test('sin colección cargada dice dónde cargarla', async ({ page }) => {
  await ir(page);
  await abrirParecidos(page);
  await page.getByRole('button', { name: 'Buscar en mi colección' }).click();
  await expect(page.getByText(/Todavía no cargaste tu colección/)).toBeVisible();
});

test('compara la armonía con toda la colección y muestra los más parecidos, sin importar la tonalidad y sin los que no se parecen; se agrega a Mis temas', async ({ page }) => {
  // la colección se carga en Temas y queda guardada en el navegador; el Play-along la usa para buscar parecidos
  await page.goto('/#/repertorio');
  await page.getByText('Mi colección (archivo JSON)').click();
  await page.locator('input[aria-label="Archivo de la colección"]').setInputFiles({ name: 'mis-temas.txt', mimeType: 'text/plain', buffer: COLECCION });
  await expect(page.getByText('«mis-temas.txt» · 1502 temas')).toBeVisible();
  await ir(page);

  await abrirParecidos(page);
  await page.getByRole('button', { name: 'Buscar en mi colección' }).click();
  const filas = page.locator('.parecidos-lista li');
  await expect(filas.first()).toBeVisible({ timeout: 30_000 });
  await expect(filas).toHaveCount(2); // el relleno no se parece: sólo entran los dos que tienen el ii–V–I
  await expect(page.getByText('Sólo 2 temas tienen algo de esta armonía.')).toBeVisible();
  // el mismo ii–V–I en otra tonalidad (D) va primero y es casi igual; el de otro estilo y otra tonalidad (F) también aparece arriba
  await expect(filas.first()).toContainText('Armonía gemela');
  await expect(filas.first()).toContainText('100 %');
  await expect(filas.first()).toContainText('casi igual');
  await expect(page.locator('.parecidos-lista')).toContainText('Cercano de otro estilo');

  // se puede agregar a Mis temas desde acá
  await page.locator('.parecidos-lista').getByRole('button', { name: 'Agregar Armonía gemela a Mis temas' }).click();
  await expect(filas.first()).toContainText('ya en Mis temas');
  const lib = await page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:library')!).tunes as { name: string }[]);
  expect(lib.map((t) => t.name)).toContain('Armonía gemela');
});
