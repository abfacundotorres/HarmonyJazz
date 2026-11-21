import { useMemo, useState } from 'react';
import { admiteEjercicios, EJERCICIOS_TEMA, ejercicioTemaById, idEjercicioTema } from '../../content/ejerciciosTema';
import type { Progression } from '../../content/progressions';
import { generatorById } from '../../exercises/generators';
import { CONCERT_KEYS, keyInterval, parseChart, transposeChart } from '../../theory/chart';
import { concertRange } from '../../state/storage';
import { useSettings } from '../hooks';
import { ExerciseCard } from './ExerciseCard';
import { LineBreakdown } from './LineBreakdown';

/**
 * Ejercicios generados sobre los acordes de un tema de Mi repertorio: guide tones, arpegios, aproximaciones y el patrón
 * 1-2-3-5, en la tonalidad del tema o en cualquiera de las 12. Sólo arma la partitura del ejercicio elegido.
 */
export function TemaEjercicios({ prog, abierto = false, ejInicial = null, keyInicial = null }: { prog: Progression; abierto?: boolean; ejInicial?: string | null; keyInicial?: string | null }) {
  const base = useMemo(() => {
    try {
      return parseChart(prog.chart);
    } catch {
      return null;
    }
  }, [prog.chart]);
  const [open, setOpen] = useState(abierto);
  const [ex, setEx] = useState<string | null>(ejInicial && ejercicioTemaById(ejInicial) ? ejInicial : null);
  if (!base) return null;
  if (!admiteEjercicios(base)) {
    return <p className="muted small">Los ejercicios generados son de 4/4: este tema es de {base.meter}, así que no se ofrecen.</p>;
  }
  return (
    <details className="temaex" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>Ejercicios sobre este tema</summary>
      <p className="muted small">
        Líneas armadas con los acordes de este tema, para trabajar sus guide tones y su armonía a tempo y en las 12 tonalidades. «Oír la línea» las toca sobre el acompañamiento.
      </p>
      <div className="row" role="group" aria-label="Ejercicio">
        {EJERCICIOS_TEMA.map((e) => (
          <button key={e.id} className={ex === e.id ? 'on' : ''} aria-pressed={ex === e.id} onClick={() => setEx(ex === e.id ? null : e.id)}>
            {e.titulo}
          </button>
        ))}
      </div>
      {open && ex && <Ejercicio key={ex} prog={prog} exId={ex} keyInicial={keyInicial} />}
    </details>
  );
}

function Ejercicio({ prog, exId, keyInicial }: { prog: Progression; exId: string; keyInicial: string | null }) {
  const [settings] = useSettings();
  const e = ejercicioTemaById(exId)!;
  // la tonalidad que viene en un enlace se valida: un valor suelto no puede romper la pantalla
  const [key, setKey] = useState(keyInicial && CONCERT_KEYS.includes(keyInicial) ? keyInicial : (prog.key ?? 'C'));
  const [seed, setSeed] = useState(0);
  const range = concertRange(settings.register);
  const { chart, notes } = useMemo(() => {
    const g = generatorById(e.generator);
    const base = parseChart(prog.chart);
    const chart = prog.key ? transposeChart(base, keyInterval(prog.key, key)) : base;
    // la «variante» cambia el registro de arranque desplazando el rango, como en Lecciones
    const shift = [0, -3, 3][seed % 3];
    return { chart, notes: g.run(chart, { low: range.low + shift, high: range.high + shift }) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prog.chart, prog.key, e, key, seed, settings.register]);

  return (
    <>
      <ExerciseCard
        id={idEjercicioTema(prog.id, e.id)}
        title={`${prog.name}: ${e.titulo}`}
        description={generatorById(e.generator).description}
        chart={chart}
        notes={notes}
        keyValue={prog.key ? key : null}
        mode={prog.mode}
        onKey={setKey}
        tempo={Math.min(prog.tempo, 100)}
        style={prog.style}
        onRegenerate={() => setSeed((s) => s + 1)}
      />
      <LineBreakdown recipe={generatorById(e.generator).recipe} chart={chart} notes={notes} />
    </>
  );
}
