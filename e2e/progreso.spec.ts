import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { expect, test } from './helpers';

const axeSrc = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

/** Datos de ejemplo con fechas relativas a hoy (el navegador de la prueba usa el reloj real). */
const seed = () => {
  const day = Math.floor(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) / 86400000);
  const iso = (back: number) => new Date((day - back) * 86400000).toISOString().slice(0, 10);
  const log: Record<string, unknown> = {};
  for (const [back, min] of [[0, 45], [1, 60], [2, 30], [9, 60], [16, 25]]) log[iso(back)] = { done: ['warm', 'tech'], minutes: min };
  localStorage.setItem('harmonyjazz:log', JSON.stringify(log));
  localStorage.setItem(
    'harmonyjazz:mastery',
    JSON.stringify({
      'guide-tones:0': { C: 120, F: 100 },
      'scale:dorian:thirds': { G: 96 },
      'scale:ionian:octave': { C: 80, D: 80, E: 80 },
      'lick:inexistente': { C: 90 },
    }),
  );
  localStorage.setItem(
    'harmonyjazz:seen',
    JSON.stringify({
      'guide-tones:0': { C: { d: day - 12, n: 1 }, F: { d: day - 1, n: 1 } }, // C vence (12 de 2 días); F no
      'scale:dorian:thirds': { G: { d: day - 20, n: 3 } }, // 20 de 9 días
      'scale:ionian:octave': { C: { d: day, n: 1 }, D: { d: day, n: 1 }, E: { d: day, n: 1 } }, // hoy
    }),
  );
};

test('Progreso: resumen, minutos por semana, repaso ordenado, balance y matrices', async ({ page }) => {
  await page.addInitScript(seed);
  await page.goto('/#/progreso');
  await expect(page.getByRole('heading', { name: 'Tu progreso' })).toBeVisible();
  // resumen: racha de 3 días, 5 días practicados, 135 min esta semana o la anterior según el día de hoy
  await expect(page.locator('.stats')).toContainText('días seguidos');
  await expect(page.locator('.stats')).toContainText('5');
  await expect(page.getByText(/En total registraste 3 h 40 min/)).toBeVisible();
  // gráfico de 12 barras y su tabla equivalente
  await expect(page.locator('.chart .plot').first().locator('i')).toHaveCount(12);
  await page.locator('details', { hasText: 'Ver como tabla' }).first().locator('summary').click();
  await expect(page.locator('details[open] table tr')).toHaveCount(12);
  // repaso: vencen dos (el de más atraso proporcional primero); la frase borrada no aparece
  const items = page.locator('#repaso .reviewlist li');
  await expect(items).toHaveCount(2);
  await expect(items.nth(0)).toContainText('marcado hace 12 días');
  await expect(items.nth(1)).toContainText('marcado hace 20 días');
  await expect(items.nth(1)).toContainText('Dórica');
  await expect(page.locator('#repaso')).toContainText('2 ejercicios vencen');
  // balance: las más flojas se resaltan (hay marcas en C, D, E, F y G; las demás empatan en 0)
  await expect(page.getByText(/Las que menos trabajaste/)).toBeVisible();
  // matrices: lección y escala, con el casillero lleno de la octava de jónica
  const ion = page.getByRole('region', { name: /Patrones de cada escala/ }).locator('tr', { hasText: 'Mayor (jónica)' });
  await expect(ion.locator('td.lv3, td.lv2, td.lv1')).toHaveCount(3);
  await expect(page.getByRole('region', { name: /Ejercicios de cada lección/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('el enlace de un repaso abre ese ejercicio en esa tonalidad', async ({ page }) => {
  await page.addInitScript(seed);
  await page.goto('/#/progreso');
  await page.locator('#repaso .reviewlist li').nth(1).getByRole('link').click();
  await expect(page).toHaveURL(/#\/escalas\?e=dorian&p=thirds&k=G/);
  await expect(page.getByRole('heading', { name: 'Dórica', level: 3 })).toBeVisible();
  await expect(page.getByRole('button', { name: /Salió limpio a/ })).toBeVisible();
});

test('Hoy muestra los primeros tres repasos y lleva a Progreso', async ({ page }) => {
  await page.addInitScript(seed);
  await page.goto('/#/hoy');
  await expect(page.locator('#repaso .reviewlist li')).toHaveCount(2);
  await expect(page.locator('#repaso').getByRole('link', { name: 'Ver mi progreso →' })).toBeVisible();
  await page.locator('#repaso').getByRole('link', { name: 'Ver mi progreso →' }).click();
  await expect(page).toHaveURL(/#\/progreso/);
});

test('marcar "Salió limpio" guarda la fecha, lo saca del repaso y suma en el balance', async ({ page }) => {
  await page.addInitScript(seed);
  await page.goto('/#/escalas?e=dorian&p=thirds&k=G');
  await page.getByRole('button', { name: /Salió limpio a/ }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:seen')!)['scale:dorian:thirds'].G);
  expect(saved.n).toBe(4);
  const today = await page.evaluate(() => Math.floor(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) / 86400000));
  expect(saved.d).toBe(today);
  await page.goto('/#/progreso');
  await expect(page.locator('#repaso .reviewlist li')).toHaveCount(1);
  // marcar de nuevo el mismo día no adelanta el calendario
  await page.goto('/#/escalas?e=dorian&p=thirds&k=G');
  await page.getByRole('button', { name: /Salió limpio a/ }).click();
  expect((await page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:seen')!)['scale:dorian:thirds'].G)).n).toBe(4);
});

test('sin datos: mensajes de bienvenida y sin tablas vacías de repaso', async ({ page }) => {
  await page.goto('/#/progreso');
  await expect(page.getByText(/Cuando marques ejercicios con "Salió limpio"/)).toBeVisible();
  await expect(page.getByText('Todavía no marcaste ninguna tonalidad.')).toBeVisible();
  await page.goto('/#/hoy');
  await expect(page.locator('#repaso')).toHaveCount(0);
});

for (const theme of ['auto', 'vintage', 'club', 'partitura', 'bn-azul', 'bn-naranja', 'bn-rojo']) {
  test(`accesibilidad de Progreso con datos (${theme})`, async ({ page }) => {
    await page.addInitScript(seed);
    await page.addInitScript((t) => localStorage.setItem('harmonyjazz:settings', JSON.stringify({ theme: t })), theme);
    await page.goto('/#/progreso');
    await expect(page.getByRole('heading', { name: 'Tu progreso' })).toBeVisible();
    await page.waitForTimeout(500);
    const violations = await page.evaluate(async (src) => {
      (0, eval)(src);
      const res = await (window as unknown as { axe: { run: (d: Document) => Promise<{ violations: { id: string; impact: string; nodes: { target: string[] }[] }[] }> } }).axe.run(document);
      return res.violations.map((v) => `${v.id} [${v.impact}] ×${v.nodes.length}: ${v.nodes[0]?.target.join(' ')}`);
    }, axeSrc);
    expect(violations).toEqual([]);
  });
}
