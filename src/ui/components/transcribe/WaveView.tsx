import { MutableRefObject, useEffect, useMemo, useRef, useState } from 'react';
import type { Analysis } from '../../../transcribe/engine';
import { Grid, gridLines, Marker } from '../../../transcribe/grid';
import type { DetectedNote } from '../../../transcribe/pitch';
import { clampView, fmtTime, normRegion, peakRange, Peaks, Region, View, zoomView } from '../../../transcribe/regions';
import { computeSpectro, estimateRefDb, midiToRow, ROWS_PER_SEMITONE, SPEC_HI, SPEC_LO, SPEC_ROWS, SpectroImage } from '../../../transcribe/spectro';
import { midiName, prettyAcc } from '../../../theory/notes';

export type ViewMode = 'wave' | 'spec';

interface Props {
  duration: number;
  peaks: Peaks | null;
  analysis: Analysis | null;
  mode: ViewMode;
  view: View;
  onView: (v: View) => void;
  region: Region | null;
  onRegion: (r: Region | null) => void;
  loopOn: boolean;
  markers: Marker[];
  grid: Grid | null;
  notes: DetectedNote[] | null;
  timeRef: MutableRefObject<number>;
  playing: boolean;
  /** Ajusta los bordes de una selección nueva (a los tiempos de la grilla). */
  snap: ((t: number) => number) | null;
  onSeek: (t: number) => void;
  /** Los nombres de nota se muestran como las lee la trompeta en Si♭. */
  written: boolean;
}

/** Captura el puntero; si el navegador no lo permite (puntero ya terminado) se sigue sin captura. */
const capture = (e: React.PointerEvent) => {
  try {
    e.currentTarget.setPointerCapture(e.pointerId);
  } catch {
    /* sin captura */
  }
};
const release = (e: React.PointerEvent) => {
  try {
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  } catch {
    /* ya liberado */
  }
};

const css = (el: Element, name: string, d: string) => getComputedStyle(el).getPropertyValue(name).trim() || d;

/** Paleta del espectrograma: azul noche → violeta → naranja → crema. */
const PALETTE = (() => {
  const stops: [number, number[]][] = [[0, [16, 14, 30]], [0.3, [58, 36, 104]], [0.6, [214, 112, 44]], [1, [255, 238, 196]]];
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const v = i / 255;
    let k = 0;
    while (k < stops.length - 2 && v > stops[k + 1][0]) k++;
    const [a, ca] = stops[k];
    const [b, cb] = stops[k + 1];
    const f = Math.min(1, Math.max(0, (v - a) / (b - a)));
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = ca[c] + (cb[c] - ca[c]) * f;
  }
  return lut;
})();

function paintSpectro(img: SpectroImage): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = img.cols;
  cv.height = img.rows;
  const g = cv.getContext('2d')!;
  const id = g.createImageData(img.cols, img.rows);
  for (let r = 0; r < img.rows; r++) {
    // la fila 0 es la más grave y va abajo
    const y = img.rows - 1 - r;
    for (let c = 0; c < img.cols; c++) {
      const v = img.data[r * img.cols + c];
      const o = (y * img.cols + c) * 4;
      id.data[o] = PALETTE[v * 3];
      id.data[o + 1] = PALETTE[v * 3 + 1];
      id.data[o + 2] = PALETTE[v * 3 + 2];
      id.data[o + 3] = 255;
    }
  }
  g.putImageData(id, 0, 0);
  return cv;
}

export function WaveView(p: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const waveCache = useRef<{ key: string; canvas: HTMLCanvasElement } | null>(null);
  const [spec, setSpec] = useState<{ img: SpectroImage; canvas: HTMLCanvasElement } | null>(null);
  const propsRef = useRef(p);
  propsRef.current = p;

  const height = p.mode === 'spec' ? 260 : 170;
  const gain = useMemo(() => {
    if (!p.peaks) return 1;
    let m = 0;
    for (let i = 0; i < p.peaks.max.length; i++) m = Math.max(m, p.peaks.max[i], -p.peaks.min[i]);
    return m > 0 ? 0.95 / m : 1;
  }, [p.peaks]);
  const refDb = useMemo(() => (p.analysis ? estimateRefDb(p.analysis.mono, p.analysis.sampleRate) : 0), [p.analysis]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.round(el.clientWidth)));
    ro.observe(el);
    setWidth(Math.round(el.clientWidth));
    return () => ro.disconnect();
  }, []);

  // espectrograma de lo que se ve (con un pequeño retardo mientras se hace zoom o se desplaza)
  useEffect(() => {
    if (p.mode !== 'spec' || !p.analysis || width <= 0) return;
    const an = p.analysis;
    const id = window.setTimeout(() => {
      const cols = Math.min(520, Math.max(80, Math.round(width / 2)));
      const img = computeSpectro(an.mono, an.sampleRate, p.view.start, p.view.start + p.view.dur, cols, refDb);
      setSpec({ img, canvas: paintSpectro(img) });
    }, 35);
    return () => window.clearTimeout(id);
  }, [p.mode, p.analysis, p.view.start, p.view.dur, refDb, width]);

  const draw = () => {
    const c = canvasRef.current;
    const q = propsRef.current;
    if (!c || !(q.duration > 0)) return;
    const dpr = window.devicePixelRatio || 1;
    const W = Math.max(1, Math.round(c.clientWidth * dpr));
    const H = Math.max(1, Math.round(c.clientHeight * dpr));
    if (c.width !== W || c.height !== H) {
      c.width = W;
      c.height = H;
    }
    const ctx = c.getContext('2d')!;
    const v = q.view;
    const xOf = (t: number) => ((t - v.start) / v.dur) * W;
    const cWave = css(c, '--muted', '#888');
    const cAcc = css(c, '--accent', '#c07a1e');
    const cLine = css(c, '--line', '#444');
    const cText = css(c, '--text', '#222');
    const spectro = q.mode === 'spec';
    ctx.clearRect(0, 0, W, H);

    if (spectro) {
      ctx.fillStyle = '#14101e';
      ctx.fillRect(0, 0, W, H);
      const sp = specRef.current;
      if (sp) {
        const x0 = xOf(sp.img.t0);
        const x1 = xOf(sp.img.t1);
        ctx.imageSmoothingEnabled = true;
        // el eje vertical de la imagen es el rango completo; se estira a la altura del lienzo
        ctx.drawImage(sp.canvas, 0, 0, sp.canvas.width, sp.canvas.height, x0, 0, x1 - x0, H);
      } else {
        ctx.fillStyle = '#9a94ad';
        ctx.font = `${12 * dpr}px system-ui, sans-serif`;
        ctx.fillText(q.analysis ? 'Calculando…' : 'El espectrograma no está disponible con el reproductor simple.', 12 * dpr, H / 2);
      }
      // líneas de cada octava (la nota que se lee como Do) con su nombre
      const shift = q.written ? 2 : 0;
      ctx.font = `${10 * dpr}px system-ui, sans-serif`;
      ctx.textBaseline = 'middle';
      for (let m = SPEC_LO; m <= SPEC_HI; m++) {
        if ((m + shift) % 12 !== 0) continue;
        const y = H - ((midiToRow(m) / SPEC_ROWS) * H);
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fillRect(0, Math.round(y), W, 1);
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillText(prettyAcc(midiName(m + shift)), 4 * dpr, y - 7 * dpr);
      }
    } else {
      let wc = waveCache.current;
      const key = `${W}x${H}|${v.start}|${v.dur}|${q.peaks ? q.peaks.max.length : 0}|${gain}|${cWave}`;
      if (!wc || wc.key !== key) {
        const off = wc?.canvas ?? document.createElement('canvas');
        off.width = W;
        off.height = H;
        const g = off.getContext('2d')!;
        g.clearRect(0, 0, W, H);
        g.fillStyle = cWave;
        const mid = H / 2;
        if (q.peaks) {
          for (let x = 0; x < W; x++) {
            const t0 = v.start + (x / W) * v.dur;
            if (t0 > q.duration) break;
            const [lo, hi] = peakRange(q.peaks, t0, v.start + ((x + 1) / W) * v.dur);
            const y1 = mid - hi * gain * mid;
            const y2 = mid - lo * gain * mid;
            g.fillRect(x, y1, 1, Math.max(1, y2 - y1));
          }
        } else g.fillRect(0, mid - 1, W, 2);
        wc = { key, canvas: off };
        waveCache.current = wc;
      }
      ctx.drawImage(wc.canvas, 0, 0);
    }

    // regla de tiempo
    const steps = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
    const step = steps.find((s) => (s / v.dur) * W >= 80 * dpr) ?? 600;
    ctx.font = `${11 * dpr}px system-ui, sans-serif`;
    ctx.textBaseline = 'top';
    const onDark = spectro;
    for (let t = Math.ceil(v.start / step) * step; t <= v.start + v.dur; t += step) {
      const x = Math.round(xOf(t)) + 0.5;
      ctx.fillStyle = onDark ? 'rgba(255,255,255,0.18)' : cLine;
      ctx.fillRect(x, 0, 1, H);
      ctx.fillStyle = onDark ? 'rgba(255,255,255,0.85)' : cText;
      ctx.fillText(fmtTime(t, step < 1 ? 1 : 0), x + 3 * dpr, 2 * dpr);
    }

    // compases y tiempos
    if (q.grid) {
      const lines = gridLines(q.grid, v);
      ctx.textBaseline = 'bottom';
      ctx.font = `bold ${11 * dpr}px system-ui, sans-serif`;
      for (const l of lines) {
        const x = Math.round(xOf(l.t)) + 0.5;
        const bar = l.bar > 0;
        ctx.fillStyle = bar ? (onDark ? 'rgba(120,200,255,0.75)' : 'rgba(40,110,190,0.7)') : onDark ? 'rgba(120,200,255,0.25)' : 'rgba(40,110,190,0.25)';
        ctx.fillRect(x, 0, bar ? 2 * dpr : 1, H);
        if (bar && (lines.length < 120 || l.bar % 4 === 1)) {
          ctx.fillStyle = onDark ? '#bfe6ff' : '#1f5a9e';
          ctx.fillText(String(l.bar), x + 4 * dpr, H - 3 * dpr);
        }
      }
    }

    // marcadores
    ctx.font = `${11 * dpr}px system-ui, sans-serif`;
    ctx.textBaseline = 'top';
    for (const m of q.markers) {
      if (m.t < v.start || m.t > v.start + v.dur) continue;
      const x = Math.round(xOf(m.t)) + 0.5;
      ctx.fillStyle = '#d6336c';
      ctx.fillRect(x - dpr / 2, 0, 2 * dpr, H);
      const label = m.name || '•';
      const w = ctx.measureText(label).width + 8 * dpr;
      ctx.fillRect(x, 16 * dpr, w, 16 * dpr);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, x + 4 * dpr, 18 * dpr);
    }

    // notas detectadas (sobre el espectrograma)
    if (spectro && q.notes) {
      ctx.font = `bold ${10 * dpr}px system-ui, sans-serif`;
      ctx.textBaseline = 'middle';
      for (const n of q.notes) {
        if (n.end < v.start || n.start > v.start + v.dur) continue;
        const x0 = xOf(n.start);
        const x1 = xOf(n.end);
        const y = H - (midiToRow(n.midi) / SPEC_ROWS) * H;
        const h = Math.max(6 * dpr, (H / SPEC_ROWS) * ROWS_PER_SEMITONE * 0.9);
        ctx.fillStyle = 'rgba(80,220,140,0.45)';
        ctx.fillRect(x0, y - h / 2, Math.max(2, x1 - x0), h);
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = dpr;
        ctx.strokeRect(x0, y - h / 2, Math.max(2, x1 - x0), h);
        if (x1 - x0 > 26 * dpr) {
          ctx.fillStyle = '#fff';
          ctx.fillText(prettyAcc(midiName(n.midi + (q.written ? 2 : 0), false)), x0 + 3 * dpr, y);
        }
      }
    }

    // selección
    const r = q.region;
    if (r) {
      const x1 = xOf(r.start);
      const x2 = xOf(r.end);
      ctx.globalAlpha = q.loopOn ? 0.3 : 0.16;
      ctx.fillStyle = cAcc;
      ctx.fillRect(x1, 0, x2 - x1, H);
      ctx.globalAlpha = 1;
      ctx.fillRect(x1 - dpr, 0, 3 * dpr, H);
      ctx.fillRect(x2 - 2 * dpr, 0, 3 * dpr, H);
      // asas para agarrar los bordes
      for (const x of [x1, x2]) {
        ctx.fillRect(x - 6 * dpr, H / 2 - 14 * dpr, 12 * dpr, 28 * dpr);
        ctx.fillStyle = '#fff';
        ctx.fillRect(x - 1 * dpr, H / 2 - 8 * dpr, 2 * dpr, 16 * dpr);
        ctx.fillStyle = cAcc;
      }
    }

    // cursor
    const xp = xOf(q.timeRef.current);
    ctx.fillStyle = onDark ? '#ffffff' : cText;
    ctx.fillRect(xp - dpr, 0, 2 * dpr, H);
  };
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const specRef = useRef(spec);
  specRef.current = spec;

  // se redibuja al cambiar lo visible; mientras suena, en cada cuadro
  useEffect(() => {
    drawRef.current();
  }, [p.view, p.region, p.loopOn, p.markers, p.grid, p.notes, p.mode, p.peaks, gain, spec, width, height, p.written, p.duration]);
  useEffect(() => {
    if (!p.playing) return;
    let raf = 0;
    const tick = () => {
      drawRef.current();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [p.playing]);
  useEffect(() => {
    // el cursor se mueve también con el audio detenido (al buscar una posición)
    const id = window.setInterval(() => !propsRef.current.playing && drawRef.current(), 120);
    return () => window.clearInterval(id);
  }, []);

  // ---- gestos
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<
    | { kind: 'select'; x0: number; t0: number; moved: boolean; edge: 'start' | 'end' | null }
    | { kind: 'pinch'; d0: number; mid0: number; view0: View }
    | null
  >(null);

  const tAt = (clientX: number, view = propsRef.current.view) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return view.start + ((clientX - rect.left) / rect.width) * view.dur;
  };
  const onDown = (e: React.PointerEvent) => {
    capture(e);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const q = propsRef.current;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { kind: 'pinch', d0: Math.max(10, Math.abs(a.x - b.x)), mid0: tAt((a.x + b.x) / 2), view0: q.view };
      return;
    }
    const rect = canvasRef.current!.getBoundingClientRect();
    const px = (t: number) => rect.left + ((t - q.view.start) / q.view.dur) * rect.width;
    let edge: 'start' | 'end' | null = null;
    if (q.region) {
      const ds = Math.abs(e.clientX - px(q.region.start));
      const de = Math.abs(e.clientX - px(q.region.end));
      if (Math.min(ds, de) < 18) edge = ds <= de ? 'start' : 'end';
    }
    gesture.current = { kind: 'select', x0: e.clientX, t0: tAt(e.clientX), moved: edge !== null, edge };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    const q = propsRef.current;
    if (!g) return;
    if (g.kind === 'pinch') {
      if (pointers.current.size < 2) return;
      const [a, b] = [...pointers.current.values()];
      const d = Math.max(10, Math.abs(a.x - b.x));
      const rect = canvasRef.current!.getBoundingClientRect();
      const midX = (a.x + b.x) / 2;
      const dur = Math.min(q.duration, Math.max(1, g.view0.dur * (g.d0 / d)));
      // el instante que estaba bajo los dedos sigue bajo los dedos
      const start = g.mid0 - ((midX - rect.left) / rect.width) * dur;
      q.onView(clampView({ start, dur }, q.duration));
      return;
    }
    if (!g.moved && Math.abs(e.clientX - g.x0) > 6) g.moved = true;
    if (!g.moved) return;
    const snap = q.snap ?? ((t: number) => t);
    const t = snap(Math.min(Math.max(0, tAt(e.clientX)), q.duration));
    const r =
      g.edge === 'start' && q.region ? normRegion(t, q.region.end, q.duration)
      : g.edge === 'end' && q.region ? normRegion(q.region.start, t, q.duration)
      : normRegion(snap(g.t0), t, q.duration);
    if (r) q.onRegion(r);
  };
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    const q = propsRef.current;
    if (g?.kind === 'select') {
      if (!g.moved) q.onSeek(Math.min(Math.max(0, g.t0), q.duration));
      gesture.current = null;
    } else if (pointers.current.size < 2) gesture.current = null;
    release(e);
  };

  // rueda: zoom (con Ctrl o Cmd) o desplazamiento; en el trackpad, el gesto de pellizco llega como Ctrl+rueda
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const q = propsRef.current;
      if (!(q.duration > 0)) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const anchor = q.view.start + ((e.clientX - rect.left) / rect.width) * q.view.dur;
      if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        q.onView(zoomView(q.view, Math.exp(e.deltaY * 0.0025), anchor, q.duration));
      } else {
        q.onView(clampView({ start: q.view.start + (e.deltaX / rect.width) * q.view.dur, dur: q.view.dur }, q.duration));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div ref={wrapRef} className="wavewrap">
      <canvas
        ref={canvasRef}
        className={'wave' + (p.mode === 'spec' ? ' spec' : '')}
        style={{ height }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={(e) => {
          pointers.current.delete(e.pointerId);
          gesture.current = null;
        }}
        aria-label="Tocá para ir a un punto, arrastrá para seleccionar un pasaje, pellizcá para acercar"
      />
      <Overview p={p} gain={gain} />
    </div>
  );
}

/** Franja con todo el audio: muestra qué parte se ve y permite moverse rápido. */
function Overview({ p, gain }: { p: Props; gain: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(p);
  propsRef.current = p;
  const drag = useRef<{ off: number } | null>(null);

  const draw = () => {
    const c = ref.current;
    const q = propsRef.current;
    if (!c || !(q.duration > 0)) return;
    const dpr = window.devicePixelRatio || 1;
    const W = Math.max(1, Math.round(c.clientWidth * dpr));
    const H = Math.max(1, Math.round(c.clientHeight * dpr));
    if (c.width !== W || c.height !== H) {
      c.width = W;
      c.height = H;
    }
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);
    const mid = H / 2;
    ctx.fillStyle = css(c, '--muted', '#888');
    for (let x = 0; x < W; x++) {
      if (q.peaks) {
        const [lo, hi] = peakRange(q.peaks, (x / W) * q.duration, ((x + 1) / W) * q.duration);
        ctx.fillRect(x, mid - hi * gain * mid, 1, Math.max(1, (hi - lo) * gain * mid));
      }
    }
    const acc = css(c, '--accent', '#c07a1e');
    if (q.region) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = acc;
      ctx.fillRect((q.region.start / q.duration) * W, 0, ((q.region.end - q.region.start) / q.duration) * W, H);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = css(c, '--text', '#222');
    ctx.fillRect((q.timeRef.current / q.duration) * W - dpr / 2, 0, dpr, H);
    ctx.strokeStyle = acc;
    ctx.lineWidth = 2 * dpr;
    ctx.strokeRect((q.view.start / q.duration) * W + dpr, dpr, Math.max(4, (q.view.dur / q.duration) * W) - 2 * dpr, H - 2 * dpr);
  };
  const drawRef = useRef(draw);
  drawRef.current = draw;
  useEffect(() => {
    drawRef.current();
  }, [p.view, p.region, p.peaks, p.duration, gain]);
  useEffect(() => {
    const id = window.setInterval(() => drawRef.current(), p.playing ? 60 : 200);
    return () => window.clearInterval(id);
  }, [p.playing]);

  const move = (clientX: number, grabOffset: number | null) => {
    const q = propsRef.current;
    const rect = ref.current!.getBoundingClientRect();
    const t = ((clientX - rect.left) / rect.width) * q.duration;
    // si se toca fuera de la ventana, se centra ahí; si se la agarra, se conserva el punto agarrado
    const start = grabOffset === null ? t - q.view.dur / 2 : t - grabOffset;
    q.onView(clampView({ start, dur: q.view.dur }, q.duration));
  };
  return (
    <canvas
      ref={ref}
      className="overview"
      onPointerDown={(e) => {
        capture(e);
        const q = propsRef.current;
        const rect = e.currentTarget.getBoundingClientRect();
        const t = ((e.clientX - rect.left) / rect.width) * q.duration;
        const inside = t >= q.view.start && t <= q.view.start + q.view.dur;
        drag.current = { off: inside ? t - q.view.start : q.view.dur / 2 };
        move(e.clientX, drag.current.off);
      }}
      onPointerMove={(e) => drag.current && move(e.clientX, drag.current.off)}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      aria-label="Vista general del audio: tocá o arrastrá para moverte"
    />
  );
}
