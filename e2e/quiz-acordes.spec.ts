import { abrirEstudio, expect, test } from './helpers';
import type { Page } from '@playwright/test';

// «¿Qué acorde sigue?»: pregunta de memoria con cuatro opciones. Las preguntas salen al azar, así que las pruebas comprueban lo que siempre
// debe cumplirse (cuatro opciones distintas, la correcta marcada al responder, el puntaje y el compás flojo), con un tema inventado.
const TEMA = { id: 'u:quizfake', name: 'Tema del quiz', composer: '', key: 'C', mode: 'major', chart: 'Dm7 | G7 | Cmaj7 | A7 | Dm7 | G7 | Cmaj7 | Cmaj7', tempo: 120, style: 'swing' };
const conTema = (page: Page) => page.addInitScript((t) => localStorage.setItem('harmonyjazz:library', JSON.stringify({ tunes: [t] })), TEMA);
const quiz = (page: Page) => page.locator('details.quiz');
const abrir = async (page: Page) => {
  await conTema(page);
  await page.goto('/#/playalong?p=u:quizfake');
  await page.waitForSelector('.board');
  await abrirEstudio(page);
  await quiz(page).locator('> summary').click();
};

test.describe('¿qué acorde sigue?', () => {
  test('pregunta con cuatro opciones distintas; al responder marca la correcta y cuenta el puntaje', async ({ page }) => {
    await abrir(page);
    await expect(quiz(page).locator('.quiz-ops button')).toHaveCount(0);
    await quiz(page).getByRole('button', { name: 'Preguntar' }).click();
    const ops = quiz(page).locator('.quiz-ops button');
    await expect(ops).toHaveCount(4);
    expect(new Set(await ops.allInnerTexts()).size).toBe(4);
    await ops.first().click();
    await expect(quiz(page).locator('.quiz-ops button.ok')).toHaveCount(1);
    await expect(ops.first()).toBeDisabled();
    const estado = quiz(page).locator('[role=status].quiz-ok, [role=status].quiz-mal');
    await expect(estado).toBeVisible();
    // lo que dice «Era …» es lo que quedó marcado como correcto
    const correcta = (await quiz(page).locator('.quiz-ops button.ok').innerText()).trim();
    await expect(estado.locator('p b').nth(1)).toHaveText(correcta);
    const acerto = await quiz(page).locator('.quiz-ok').count();
    await expect(page.getByTestId('quiz-puntos')).toHaveText(`Aciertos: ${acerto} de 1`);
    // la siguiente pregunta vuelve a tener opciones habilitadas
    await quiz(page).getByRole('button', { name: 'Siguiente' }).click();
    await expect(quiz(page).locator('.quiz-ops button:not([disabled])')).toHaveCount(4);
    await expect(page.getByTestId('quiz-puntos')).toHaveText(/de 1$/);
  });

  test('con «Ninguno» se pregunta sin pistas; con pistas se ven los acordes anteriores', async ({ page }) => {
    await abrir(page);
    await quiz(page).getByRole('button', { name: 'Ninguno' }).click();
    await quiz(page).getByRole('button', { name: 'Preguntar' }).click();
    await expect(quiz(page).locator('.quiz-chip')).toHaveCount(0);
    await expect(quiz(page).locator('.quiz-ctx')).toContainText(/¿(Con qué acorde empieza el tema|Qué acorde viene en el compás \d+)\?/);
    await quiz(page).getByRole('button', { name: '4', exact: true }).click();
    // con cuatro pistas hay entre 1 y 4 acordes previos más el «¿?» (la primera pregunta puede caer al comienzo del tema)
    const chips = await quiz(page).locator('.quiz-chip').count();
    expect(chips === 0 || (chips >= 2 && chips <= 5)).toBe(true);
  });

  test('fallar permite marcar el compás como flojo, y queda guardado', async ({ page }) => {
    await abrir(page);
    await quiz(page).getByRole('button', { name: 'Preguntar' }).click();
    let marcar = quiz(page).getByRole('button', { name: /Marcar el compás \d+ como flojo/ });
    for (let i = 0; i < 30 && !(await marcar.count()); i++) {
      // se responde siempre la primera opción hasta fallar una
      await quiz(page).locator('.quiz-ops button').first().click();
      if (await marcar.count()) break;
      await quiz(page).getByRole('button', { name: 'Siguiente' }).click();
      marcar = quiz(page).getByRole('button', { name: /Marcar el compás \d+ como flojo/ });
    }
    await expect(marcar).toBeVisible();
    const compas = Number(/compás (\d+)/.exec(await marcar.innerText())![1]);
    await marcar.click();
    await expect(quiz(page).getByRole('button', { name: '⚑ Compás marcado' })).toBeDisabled();
    await expect(page.locator('.board .bar.floja')).toHaveCount(1);
    const guardado = await page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:flojos') ?? '{}'));
    expect(guardado['u:quizfake']).toEqual([compas - 1]);
  });

  test('«Ocultar la grilla» pone el modo de memoria en Oculto', async ({ page }) => {
    await abrir(page);
    await quiz(page).getByRole('button', { name: 'Ocultar la grilla' }).click();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:memoria') ?? '{}').modo)).toBe('oculto');
    await expect(quiz(page).getByRole('button', { name: 'Ocultar la grilla' })).toHaveCount(0);
  });

  test('un tema de un solo acorde no rompe la pantalla', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('harmonyjazz:library', JSON.stringify({ tunes: [{ id: 'u:unsolo', name: 'Un solo acorde', composer: '', key: 'C', mode: 'major', chart: 'Cmaj7 | Cmaj7', tempo: 100, style: 'swing' }] })));
    await page.goto('/#/playalong?p=u:unsolo');
    await page.waitForSelector('.board');
    await abrirEstudio(page);
    await quiz(page).locator('> summary').click();
    await quiz(page).getByRole('button', { name: 'Preguntar' }).click();
    await expect(quiz(page).locator('.quiz-ops button')).toHaveCount(0);
    await expect(page.locator('.board .bar').first()).toBeVisible();
  });
});
