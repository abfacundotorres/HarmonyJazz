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
  /** Pulsos agendados por el motor (el péndulo los lee en cada cuadro). */
  beats: MutableRefObject<SwingBeat[]>;
  /** Reloj de audio de lo que se oye ahora. */
  now: () => number;
}

/** Metrónomo de péndulo (tipo Maelzel) dibujado en SVG. La varilla se anima con el reloj de audio; la pesa se arrastra para cambiar el tempo. */
export function Pendulum({ tempo, onTempo, running, beats, now }: Props) {
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
    <svg ref={svg} className="pendulum" viewBox="0 34 240 346" role="group" aria-label="Metrónomo de péndulo" onPointerMove={(e) => drag.current && toTempo(e)} onPointerUp={() => (drag.current = false)} onPointerCancel={() => (drag.current = false)}>
      <defs>
        <linearGradient id="pend-wood" x1="0" x2="1">
          <stop offset="0" stopColor="#8a5a2b" />
          <stop offset="0.45" stopColor="#c58f55" />
          <stop offset="1" stopColor="#7a4b21" />
        </linearGradient>
        <linearGradient id="pend-brass" x1="0" x2="1">
          <stop offset="0" stopColor="#8a6a1f" />
          <stop offset="0.5" stopColor="#f0d078" />
          <stop offset="1" stopColor="#8a6a1f" />
        </linearGradient>
        <linearGradient id="pend-rod" x1="0" x2="1">
          <stop offset="0" stopColor="#bfb7a6" />
          <stop offset="0.5" stopColor="#f6f1e4" />
          <stop offset="1" stopColor="#bfb7a6" />
        </linearGradient>
      </defs>
      <g aria-hidden="true">
        <rect x="14" y="356" width="212" height="16" rx="4" fill="#5d3a18" />
        <polygon points="26,358 214,358 158,66 82,66" fill="url(#pend-wood)" stroke="#4b2d10" strokeWidth="2" />
        <polygon points="40,350 200,350 153,86 87,86" fill="#6b4421" opacity="0.55" />
        <rect x="76" y="58" width="88" height="12" rx="3" fill="#5d3a18" />
        <ellipse cx="120" cy="334" rx="40" ry="9" fill="#3a230d" opacity="0.5" />
      </g>
      <g ref={rod}>
        <g aria-hidden="true">
          <rect x="114" y={PIVOT.y - D_MAX - 14} width="12" height={D_MAX + 14 + 30} rx="2" fill="url(#pend-rod)" stroke="#7d7461" strokeWidth="1" />
          {SCALE_MARKS.map((m, i) => {
            const y = PIVOT.y - dist(m);
            const big = i % 2 === 0;
            return (
              <g key={m}>
                <line x1="114" x2={big ? 121 : 118} y1={y} y2={y} stroke="#3b3426" strokeWidth="1" />
                {big && (
                  <text x="123" y={y + 2.4} fontSize="7" fill="#3b3426" fontFamily="system-ui, sans-serif">
                    {m}
                  </text>
                )}
              </g>
            );
          })}
          <circle cx="120" cy={PIVOT.y + 24} r="7" fill="url(#pend-brass)" stroke="#6c5316" strokeWidth="1" />
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
          <path d="M-19 13 L-12 -13 L12 -13 L19 13 Z" fill="url(#pend-brass)" stroke="#6c5316" strokeWidth="1.5" />
          <line x1="-15" x2="15" y1="0" y2="0" stroke="#6c5316" strokeWidth="1" opacity="0.7" />
        </g>
      </g>
      <g aria-hidden="true">
        <circle cx={PIVOT.x} cy={PIVOT.y} r="9" fill="url(#pend-brass)" stroke="#6c5316" strokeWidth="1.5" />
        <circle cx={PIVOT.x} cy={PIVOT.y} r="2.6" fill="#3b2a08" />
      </g>
    </svg>
  );
}
