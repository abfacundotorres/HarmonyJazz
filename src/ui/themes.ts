/**
 * Temas (skins) de la app. Cada uno cambia la paleta, la tipografía de los títulos y la textura de fondo.
 *
 * Los valores reales viven en `styles.css` (un bloque `:root[data-theme='…']` por tema); acá está lo que la
 * interfaz necesita saber (el nombre, y los colores para dibujar la vista previa) y lo que los tests comprueban:
 * que ambos coincidan y que cada paleta cumpla el contraste mínimo (4,5:1) para texto.
 */
export type ThemeId = 'auto' | 'vintage' | 'club' | 'partitura' | 'bn-azul' | 'bn-naranja' | 'bn-rojo' | 'oled' | 'verde-estudio' | 'noche-azul' | 'alto-contraste';

export interface Palette {
  bg: string;
  surface: string;
  surface2: string;
  line: string;
  text: string;
  muted: string;
  accent: string;
  accentInk: string;
}

export interface Theme {
  id: ThemeId;
  label: string;
  desc: string;
  /** Claro u oscuro (controles nativos, barras de desplazamiento). */
  scheme: 'light' | 'dark';
  /** Familia de los títulos, para la vista previa. */
  font: string;
  fontName: string;
  palette: Palette;
}

const DM = "'DM Serif Display', Georgia, 'Times New Roman', serif";
const BARLOW = "'Barlow Condensed', 'DM Serif Display', Georgia, serif";
const BASKERVILLE = "'Libre Baskerville', Georgia, 'Times New Roman', serif";

/** Los once temas, sin "automático" (que elige entre Vintage y Club según el celular). */
export const THEMES: Theme[] = [
  {
    id: 'vintage',
    label: 'Vintage',
    desc: 'Papel beige y tinta marrón, con textura de papel. El aspecto clásico de la app.',
    scheme: 'light',
    font: DM,
    fontName: 'DM Serif Display',
    palette: { bg: '#ecdfc0', surface: '#f7eed6', surface2: '#eadcb8', line: '#cdb98a', text: '#2a1d10', muted: '#6b5638', accent: '#7d4f0c', accentInk: '#ffffff' },
  },
  {
    id: 'club',
    label: 'Club de noche',
    desc: 'Marrón cálido y latón, para tocar con poca luz.',
    scheme: 'dark',
    font: DM,
    fontName: 'DM Serif Display',
    palette: { bg: '#17120d', surface: '#221a13', surface2: '#2c231a', line: '#4a3b2a', text: '#f1e9df', muted: '#a89a8b', accent: '#e0a64a', accentInk: '#1b1308' },
  },
  {
    id: 'partitura',
    label: 'Papel de partitura',
    desc: 'Blanco liso y tinta negra, con lápiz rojo para marcar. Sin texturas, tipografía de imprenta.',
    scheme: 'light',
    font: BASKERVILLE,
    fontName: 'Libre Baskerville',
    palette: { bg: '#f5f5f2', surface: '#ffffff', surface2: '#ebebe6', line: '#c8c8c0', text: '#141414', muted: '#55554f', accent: '#8a1c1c', accentInk: '#ffffff' },
  },
  {
    id: 'bn-azul',
    label: 'Blue Note · azul',
    desc: 'Azul profundo, crema y amarillo, como una carátula de los años 60. Títulos en condensada y puntos de trama.',
    scheme: 'dark',
    font: BARLOW,
    fontName: 'Barlow Condensed',
    palette: { bg: '#0a2342', surface: '#0f3059', surface2: '#153a6b', line: '#2d5a96', text: '#f6f1e3', muted: '#aec3de', accent: '#ffb81c', accentInk: '#1a1204' },
  },
  {
    id: 'bn-naranja',
    label: 'Blue Note · naranja',
    desc: 'Fondo naranja, tinta negra y azul tinta: el otro clásico de las carátulas.',
    scheme: 'light',
    font: BARLOW,
    fontName: 'Barlow Condensed',
    palette: { bg: '#f08a24', surface: '#fff1d9', surface2: '#fbddb0', line: '#b4560c', text: '#1a1109', muted: '#3d2208', accent: '#082a66', accentInk: '#ffffff' },
  },
  {
    id: 'bn-rojo',
    label: 'Blue Note · rojo',
    desc: 'Negro, crema y rojo vivo. Contraste fuerte para escenario.',
    scheme: 'dark',
    font: BARLOW,
    fontName: 'Barlow Condensed',
    palette: { bg: '#0e0e0e', surface: '#1b1b1b', surface2: '#262626', line: '#4d4d4d', text: '#f3ecd9', muted: '#b3ab98', accent: '#ff4a3a', accentInk: '#140400' },
  },
  {
    id: 'oled',
    label: 'Negro puro',
    desc: 'Negro total con latón: en pantallas OLED apaga los píxeles del fondo y ahorra batería. Para tocar de noche.',
    scheme: 'dark',
    font: DM,
    fontName: 'DM Serif Display',
    palette: { bg: '#000000', surface: '#0d0d0d', surface2: '#181818', line: '#3a3a3a', text: '#f2efe9', muted: '#aaa59b', accent: '#e0a64a', accentInk: '#1b1308' },
  },
  {
    id: 'verde-estudio',
    label: 'Estudio verde',
    desc: 'Verde oscuro de mesa de estudio con dorado: descansa la vista en sesiones largas.',
    scheme: 'dark',
    font: DM,
    fontName: 'DM Serif Display',
    palette: { bg: '#0f1d17', surface: '#16291f', surface2: '#1d3528', line: '#3a5c49', text: '#eaf1e6', muted: '#9fb8a6', accent: '#e8b84a', accentInk: '#1a1404' },
  },
  {
    id: 'noche-azul',
    label: 'Noche azul',
    desc: 'Azul de medianoche con verde agua: oscuro y frío, distinto del marrón de Club de noche.',
    scheme: 'dark',
    font: DM,
    fontName: 'DM Serif Display',
    palette: { bg: '#101826', surface: '#172237', surface2: '#1f2d47', line: '#3a4f75', text: '#e8edf7', muted: '#9fb0cc', accent: '#7fd0c0', accentInk: '#04201b' },
  },
  {
    id: 'alto-contraste',
    label: 'Alto contraste',
    desc: 'Blanco y negro con azul fuerte y bordes marcados: para leer a pleno sol o con poca vista.',
    scheme: 'light',
    font: BASKERVILLE,
    fontName: 'Libre Baskerville',
    palette: { bg: '#ffffff', surface: '#ffffff', surface2: '#efefef', line: '#6b6b6b', text: '#000000', muted: '#3a3a3a', accent: '#0b3d91', accentInk: '#ffffff' },
  },
];

export const THEME_IDS: readonly ThemeId[] = ['auto', ...THEMES.map((t) => t.id)];

export const themeById = (id: string): Theme | undefined => THEMES.find((t) => t.id === id);

/** Color de la barra del navegador para el tema (el automático sigue al celular). */
export function themeColor(id: ThemeId, prefersLight: boolean): string {
  const t = id === 'auto' ? themeById(prefersLight ? 'vintage' : 'club')! : themeById(id) ?? themeById('club')!;
  return t.palette.bg;
}

/** Aplica el tema al documento: el atributo `data-theme` (sin atributo = automático) y el color de la barra. */
export function applyTheme(id: ThemeId, doc: Document = document, win: Window = window) {
  const root = doc.documentElement;
  if (id === 'auto' || !themeById(id)) root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', id);
  const light = typeof win.matchMedia === 'function' && win.matchMedia('(prefers-color-scheme: light)').matches;
  doc.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor(id, light));
}

/** Contraste WCAG entre dos colores #rrggbb (1 a 21). */
export function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
