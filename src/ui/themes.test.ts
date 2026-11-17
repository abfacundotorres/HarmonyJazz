import { describe, expect, it } from 'vitest';
import { sanitizeSettings } from '../state/sanitize';
import { contrast, THEME_IDS, THEMES, themeColor } from './themes';

// (vitest deja vacías las importaciones de CSS y el proyecto no incluye los tipos de Node: se lee el archivo con el módulo incorporado)
const fs = (globalThis as unknown as { process: { getBuiltinModule: (n: string) => { readFileSync: (p: URL, enc: string) => string } } }).process.getBuiltinModule('node:fs');
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

/** Declaraciones `--x: v;` y `color-scheme: v;` de un bloque de CSS. */
const decls = (body: string) => Object.fromEntries([...body.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(?:--)?([\w-]+):\s*([^;]+);/g)].map((x) => [x[1], x[2].trim()]));
/** Variables de un bloque `:root[data-theme='id']` del CSS (puede compartir selector con otros). */
const block = (id: string) => {
  const re = new RegExp(`(?:^|\\n)([^{}]*:root\\[data-theme='${id}'\\][^{}]*)\\{([^}]*)\\}`, 'g');
  const all = [...css.matchAll(re)];
  expect(all.length, `falta el bloque del tema ${id} en styles.css`).toBeGreaterThan(0);
  // un tema puede tener un bloque propio y otro compartido con sus hermanos (la tipografía): se juntan
  return Object.assign({}, ...all.map((m) => decls(m[2])));
};

describe('temas', () => {
  for (const t of THEMES) {
    describe(t.label, () => {
      const p = t.palette;
      it('la paleta del CSS coincide con la de themes.ts', () => {
        const v = block(t.id);
        expect(v.bg).toBe(p.bg);
        expect(v.surface).toBe(p.surface);
        expect(v['surface-2']).toBe(p.surface2);
        expect(v.line).toBe(p.line);
        expect(v.text).toBe(p.text);
        expect(v.muted).toBe(p.muted);
        expect(v.accent).toBe(p.accent);
        expect(v['accent-ink']).toBe(p.accentInk);
        expect(v['color-scheme']).toBe(t.scheme);
      });
      it('el texto y los acentos cumplen 4,5:1 sobre el fondo y sobre las tarjetas', () => {
        for (const bg of [p.bg, p.surface, p.surface2]) {
          expect(contrast(p.text, bg), `texto sobre ${bg}`).toBeGreaterThanOrEqual(4.5);
          expect(contrast(p.muted, bg), `texto tenue sobre ${bg}`).toBeGreaterThanOrEqual(4.5);
          expect(contrast(p.accent, bg), `acento sobre ${bg}`).toBeGreaterThanOrEqual(4.5);
        }
        expect(contrast(p.accentInk, p.accent), 'texto sobre el acento').toBeGreaterThanOrEqual(4.5);
      });
    });
  }

  it('el modo claro automático usa la misma paleta que Vintage, y el oscuro la de Club de noche', () => {
    const light = /@media \(prefers-color-scheme: light\) \{\s*:root:not\(\[data-theme\]\) \{([^}]*)\}/.exec(css);
    expect(light).toBeTruthy();
    const v = decls(light![1]);
    const vintage = block('vintage');
    for (const k of ['bg', 'surface', 'surface-2', 'line', 'text', 'muted', 'accent', 'accent-ink', 'tension', 'paper']) expect(v[k], k).toBe(vintage[k]);
    const root = /:root \{([^}]*)\}/.exec(css)![1];
    const base = decls(root);
    const club = block('club');
    for (const k of ['bg', 'surface', 'surface-2', 'line', 'text', 'muted', 'accent', 'accent-ink']) expect(base[k], k).toBe(club[k]);
  });

  it('los identificadores son únicos y "automático" va primero', () => {
    expect(new Set(THEME_IDS).size).toBe(THEME_IDS.length);
    expect(THEME_IDS[0]).toBe('auto');
    expect(THEME_IDS.length).toBe(THEMES.length + 1);
  });

  it('la barra del navegador toma el fondo del tema (el automático sigue al celular)', () => {
    expect(themeColor('bn-azul', true)).toBe('#0a2342');
    expect(themeColor('auto', true)).toBe('#ecdfc0');
    expect(themeColor('auto', false)).toBe('#17120d');
  });

  it('un tema desconocido o dañado en lo guardado se descarta', () => {
    expect(sanitizeSettings({ theme: 'bn-rojo' })).toEqual({ theme: 'bn-rojo' });
    expect(sanitizeSettings({ theme: 'neón' })).toEqual({});
    expect(sanitizeSettings({ theme: 7 })).toEqual({});
  });
});
