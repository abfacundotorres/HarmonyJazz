import { type MutableRefObject, useEffect, useRef } from 'react';
import { MAX_TEMPO, MIN_TEMPO } from '../../audio/metronomePlan';
import { pendulumAngle, posToTempo, SCALE_MARKS, SWING_DEG, tempoName, tempoToPos, type SwingBeat, trimBeats } from '../../audio/pendulum';

const PIVOT = { x: 120, y: 318 };
/** Distancia de la pesa al pivote: abajo (rápido) y arriba (lento). */
const D_MIN = 62;
const D_MAX = 252;
const dist = (tempo: number) => D_MAX - tempoToPos(tempo) * (D_MAX - D_MIN);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

interface Props {
  tempo: number;
  onTempo: (bpm: number) => void;
  running: boolean;
  /** Empezar o parar (botón sobre el zócalo del aparato). */
  onToggle: () => void;
  /** Pulsos agendados por el motor (el péndulo los lee en cada cuadro). */
  beats: MutableRefObject<SwingBeat[]>;
  /** Reloj de audio de lo que se oye ahora. */
  now: () => number;
}

/** Metrónomo de péndulo (tipo Maelzel) dibujado en SVG. La varilla se anima con el reloj de audio; la pesa se arrastra para cambiar el tempo. */
export function Pendulum({ tempo, onTempo, running, onToggle, beats, now }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const rod = useRef<SVGGElement>(null);
  const angle = useRef(0);
  const drag = useRef(false);
  const startedAt = useRef(0);
  const startAngle = useRef(0);
  const live = useRef({ running, now });
  live.current = { running, now };

  // animación: lee el reloj de audio en cada cuadro y gira la varilla sin pasar por el estado de React
  useEffect(() => {
    let raf = 0;
    const paint = (deg: number) => {
      angle.current = deg;
      rod.current?.setAttribute('transform', `rotate(${deg.toFixed(2)} ${PIVOT.x} ${PIVOT.y})`);
    };
    const frame = () => {
      const { running: on, now: clock } = live.current;
      if (on) {
        const t = clock();
        const list = beats.current;
        if (list.length && list[0].time > t) {
          // antes del primer pulso: pasa del reposo al tope en lo que falta
          const u = clamp((t - startedAt.current) / Math.max(0.05, list[0].time - startedAt.current), 0, 1);
          paint(startAngle.current + (SWING_DEG - startAngle.current) * ((1 - Math.cos(Math.PI * u)) / 2));
        } else if (list.length) {
          beats.current = trimBeats(list, t);
          paint(pendulumAngle(t, beats.current, angle.current));
        }
      } else if (Math.abs(angle.current) > 0.05) {
        paint(angle.current * 0.86); // se detiene amortiguándose
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [beats]);
  useEffect(() => {
    if (running) {
      startedAt.current = live.current.now();
      startAngle.current = angle.current;
    }
  }, [running]);

  const toTempo = (e: React.PointerEvent) => {
    const el = svg.current;
    const m = el?.getScreenCTM();
    if (!el || !m) return;
    const p = el.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const q = p.matrixTransform(m.inverse());
    const a = (angle.current * Math.PI) / 180;
    // proyección sobre la varilla (inclinada): distancia desde el pivote
    const d = (q.x - PIVOT.x) * Math.sin(a) - (q.y - PIVOT.y) * Math.cos(a);
    const pos = (D_MAX - d) / (D_MAX - D_MIN);
    onTempo(clamp(Math.round(posToTempo(pos)), MIN_TEMPO, MAX_TEMPO));
  };

  const onKey = (e: React.KeyboardEvent) => {
    const step = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10 }[e.key];
    if (step !== undefined) onTempo(clamp(tempo + step, MIN_TEMPO, MAX_TEMPO));
    else if (e.key === 'Home') onTempo(MIN_TEMPO);
    else if (e.key === 'End') onTempo(MAX_TEMPO);
    else return;
    e.preventDefault();
  };

  const wy = PIVOT.y - dist(tempo);
  return (
    <div className="pend-wrap">
    <svg ref={svg} className="pendulum" viewBox="0 40 240 370" role="group" aria-label="Metrónomo de péndulo" onPointerMove={(e) => drag.current && toTempo(e)} onPointerUp={() => (drag.current = false)} onPointerCancel={() => (drag.current = false)}>
      <defs>
        <linearGradient id="pend-wood" x1="0" x2="1">
          <stop offset="0" stopColor="#7a4a22" />
          <stop offset="0.3" stopColor="#b9814a" />
          <stop offset="0.55" stopColor="#a56d3a" />
          <stop offset="1" stopColor="#5e3718" />
        </linearGradient>
        <linearGradient id="pend-panel" x1="0" x2="1">
          <stop offset="0" stopColor="#4a2b10" />
          <stop offset="0.4" stopColor="#6d4420" />
          <stop offset="1" stopColor="#3d230c" />
        </linearGradient>
        <linearGradient id="pend-brass" x1="0" x2="1">
          <stop offset="0" stopColor="#7d5a14" />
          <stop offset="0.3" stopColor="#e9c868" />
          <stop offset="0.55" stopColor="#fff0b0" />
          <stop offset="0.75" stopColor="#c99a2e" />
          <stop offset="1" stopColor="#6e4d0f" />
        </linearGradient>
        <linearGradient id="pend-steel" x1="0" x2="1">
          <stop offset="0" stopColor="#8d8a82" />
          <stop offset="0.35" stopColor="#f4f1ea" />
          <stop offset="0.6" stopColor="#cfcabd" />
          <stop offset="1" stopColor="#77736a" />
        </linearGradient>
        <linearGradient id="pend-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9a468" />
          <stop offset="1" stopColor="#8a5a2b" />
        </linearGradient>
        <radialGradient id="pend-shadow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="0.55" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        {/* veta de la madera: ruido estirado en vertical, sólo se dibuja una vez (no se anima) */}
        <filter id="pend-grain" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.018 0.55" numOctaves="3" seed="11" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.16  0 0 0 0 0.07  0 0 0 0 0.02  0 0 0 2.6 -0.95" result="g" />
          <feComposite in="g" in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
      <g aria-hidden="true">
        <ellipse cx="120" cy="396" rx="112" ry="10" fill="url(#pend-shadow)" />
        {/* zócalo */}
        <rect x="12" y="350" width="216" height="46" rx="9" fill="url(#pend-wood)" stroke="#3a2008" strokeWidth="1.5" />
        <rect x="12" y="350" width="216" height="46" rx="9" fill="#000" filter="url(#pend-grain)" opacity="0.7" />
        <rect x="14" y="351" width="212" height="5" rx="3" fill="#fff" opacity="0.22" />
        {/* cuerpo piramidal */}
        <polygon points="28,352 212,352 160,62 80,62" fill="url(#pend-wood)" stroke="#3a2008" strokeWidth="2" strokeLinejoin="round" />
        <polygon points="28,352 212,352 160,62 80,62" fill="#000" filter="url(#pend-grain)" opacity="0.75" />
        <polyline points="30,350 82,64" fill="none" stroke="#f3cf9a" strokeOpacity="0.55" strokeWidth="2.2" strokeLinecap="round" />
        <polyline points="210,350 158,64" fill="none" stroke="#2c1706" strokeOpacity="0.5" strokeWidth="2.2" strokeLinecap="round" />
        {/* tapa */}
        <path d="M74 66 L74 56 Q74 48 82 48 L158 48 Q166 48 166 56 L166 66 Z" fill="url(#pend-top)" stroke="#3a2008" strokeWidth="1.5" />
        <rect x="80" y="50" width="80" height="3" rx="1.5" fill="#fff" opacity="0.3" />
        {/* frente hundido con marco de latón */}
        <polygon points="46,336 194,336 152,88 88,88" fill="url(#pend-panel)" stroke="url(#pend-brass)" strokeWidth="2.4" strokeLinejoin="round" />
        <polygon points="50,333 190,333 150,92 90,92" fill="none" stroke="#000" strokeOpacity="0.35" strokeWidth="1.5" />
        {/* placa de latón y tornillos */}
        <rect x="99" y="96" width="42" height="9" rx="2" fill="url(#pend-brass)" stroke="#6e4d0f" strokeWidth="0.8" />
        <line x1="104" x2="136" y1="100.5" y2="100.5" stroke="#6e4d0f" strokeWidth="0.8" opacity="0.7" />
        {[[58, 328], [182, 328], [95, 100], [145, 100]].map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <circle cx={x} cy={y} r="2.6" fill="url(#pend-brass)" stroke="#5a3f0a" strokeWidth="0.6" />
            <line x1={x - 1.7} x2={x + 1.7} y1={y - 0.5} y2={y + 0.5} stroke="#5a3f0a" strokeWidth="0.7" />
          </g>
        ))}
        {/* llave de cuerda en el costado */}
        <path d="M204 262 q14 -3 18 -14 q3 -8 -3 -9 q-5 0 -6 6 q-1 5 -9 7 z M204 262 q14 3 18 14 q3 8 -3 9 q-5 0 -6 -6 q-1 -5 -9 -7 z" fill="url(#pend-brass)" stroke="#5a3f0a" strokeWidth="0.9" />
        <circle cx="203" cy="262" r="5" fill="url(#pend-brass)" stroke="#5a3f0a" strokeWidth="0.9" />
      </g>
      <g ref={rod}>
        <g aria-hidden="true">
          <rect x="116" y={PIVOT.y - D_MAX - 14} width="8" height={D_MAX + 14 + 34} rx="2.5" fill="url(#pend-steel)" stroke="#4d493f" strokeWidth="0.9" />
          <rect x="116" y={PIVOT.y - D_MAX - 14} width="8" height="6" rx="2.5" fill="url(#pend-brass)" stroke="#5a3f0a" strokeWidth="0.8" />
          {SCALE_MARKS.map((m, i) => {
            const y = PIVOT.y - dist(m);
            const big = i % 2 === 0;
            return (
              <g key={m}>
                <line x1="116" x2={big ? 123 : 120} y1={y} y2={y} stroke="#2b261b" strokeWidth="0.9" />
                {big && (
                  <text x="125.5" y={y + 2.3} fontSize="7.5" fill="#fff6dc" stroke="#1a140a" strokeWidth="0.35" paintOrder="stroke" fontFamily="system-ui, sans-serif">
                    {m}
                  </text>
                )}
              </g>
            );
          })}
          {/* contrapeso inferior */}
          <circle cx="120" cy={PIVOT.y + 26} r="8" fill="url(#pend-brass)" stroke="#5a3f0a" strokeWidth="1" />
          <ellipse cx="117.5" cy={PIVOT.y + 23.5} rx="2.6" ry="1.6" fill="#fff" opacity="0.6" />
        </g>
        <g
          className="pend-weight"
          role="slider"
          tabIndex={0}
          aria-label="Pesa del metrónomo (tempo)"
          aria-orientation="vertical"
          aria-valuemin={MIN_TEMPO}
          aria-valuemax={MAX_TEMPO}
          aria-valuenow={tempo}
          aria-valuetext={`${tempo} pulsos por minuto, ${tempoName(tempo)}`}
          transform={`translate(120 ${wy})`}
          onKeyDown={onKey}
          onPointerDown={(e) => {
            drag.current = true;
            svg.current?.setPointerCapture(e.pointerId);
            toTempo(e);
          }}
        >
          <circle r="30" fill="transparent" />
          <path d="M-19 14 L-12 -14 L12 -14 L19 14 Z" fill="url(#pend-brass)" stroke="#5a3f0a" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M-13.5 -10 L13.5 -10" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M-16 9 L16 9" stroke="#5a3f0a" strokeOpacity="0.5" strokeWidth="1.2" />
          <rect x="-4" y="-5" width="8" height="9" rx="2" fill="#5a3f0a" opacity="0.55" />
        </g>
      </g>
      <g aria-hidden="true">
        <circle cx={PIVOT.x} cy={PIVOT.y} r="10" fill="url(#pend-brass)" stroke="#5a3f0a" strokeWidth="1.4" />
        <circle cx={PIVOT.x} cy={PIVOT.y} r="3.4" fill="#4a3308" />
        <ellipse cx={PIVOT.x - 3.5} cy={PIVOT.y - 4} rx="3" ry="1.8" fill="#fff" opacity="0.55" />
      </g>
    </svg>
    <button className="pend-play" onClick={onToggle} aria-label={running ? 'Parar' : 'Empezar'} aria-pressed={running} title={running ? 'Parar' : 'Empezar'}>
      <svg viewBox="0 0 24 24" aria-hidden="true">{running ? <rect x="6" y="6" width="12" height="12" rx="1.5" /> : <path d="M8 5.5 L19 12 L8 18.5 Z" />}</svg>
    </button>
    </div>
  );
}
