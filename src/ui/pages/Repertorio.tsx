import { useMemo } from 'react';
import { logrados, marcar, PASOS, siguientePaso, tocado } from '../../content/repertorio';
import { dayNum } from '../../state/progress';
import { useMonth, usePersistentLibrary, useRepertorio, useRoute } from '../hooks';
import { TemaEjercicios } from '../components/TemaEjercicios';
import { progresionDeTema } from '../progresionDeTema';
import { temasDeRepertorio } from '../repertorioTemas';

const hace = (d: number) => (d <= 0 ? 'hoy' : d === 1 ? 'ayer' : `hace ${d} días`);

/** Mi repertorio: la escalera de siete pasos de cada tema que estás aprendiendo, con la fecha de la última vez que lo tocaste. */
export function Repertorio() {
  const [rep, setRep] = useRepertorio();
  const [lib] = usePersistentLibrary();
  const [mp] = useMonth();
  const hoy = dayNum();
  const today = useMemo(() => new Date(), []);
  const { temas, delMes } = useMemo(() => temasDeRepertorio(lib, mp, today), [lib, mp, today]);
  const { query } = useRoute();

  return (
    <div className="page repertorio">
      <section className="card">
        <h2>Mi repertorio</h2>
        <p className="muted">
          Cada tema que estás aprendiendo tiene siete pasos, de saber la forma a tenerlo grabado. Tildá lo que ya te sale; la app te avisa cuando hace una semana que no lo tocás. Los temas son los de Play-along → Mis temas, y el tema del mes de la currícula.
        </p>
      </section>

      {temas.length === 0 && (
        <section className="card">
          <p>Todavía no cargaste ningún tema. Cargá el cifrado de un standard de tu libro en Play-along → Mis temas y aparece acá.</p>
          <p>
            <a className="button primary" href="#/playalong">Ir a Play-along</a>
          </p>
        </section>
      )}

      {temas.map((t) => {
        const a = rep[t.id];
        const n = logrados(a);
        const sig = siguientePaso(a);
        return (
          <section key={t.id} className="card tema" aria-label={t.name}>
            <header>
              <h3>{t.name}</h3>
              {t.id === delMes && <span className="muted small">Tema del mes</span>}
            </header>
            <progress max={PASOS.length} value={n} aria-label={`Pasos logrados de ${t.name}`} />
            <p className="small">
              {n} de {PASOS.length} pasos · {a && a.ultimo > 0 ? `lo tocaste ${hace(hoy - a.ultimo)}` : 'todavía no lo tocaste'}
              {sig !== null ? ` · sigue: ${PASOS[sig].titulo}` : ' · ¡completo!'}
            </p>
            <ol className="pasos">
              {PASOS.map((p, i) => (
                <li key={p.id} className={sig === i ? 'next' : ''}>
                  <label>
                    <input type="checkbox" checked={!!a?.hechos.includes(i)} onChange={() => setRep((r) => marcar(r, t.id, i, dayNum()))} aria-label={`${t.name}: ${p.titulo}`} /> <b>{p.titulo}</b>
                  </label>
                  <small className="muted">{p.ayuda}</small>
                </li>
              ))}
            </ol>
            <div className="row">
              <button onClick={() => setRep((r) => tocado(r, t.id, dayNum()))}>Lo toqué hoy</button>
              <a className="button" href={`#/playalong?p=${encodeURIComponent(t.id)}`}>Abrir en el play-along</a>
            </div>
            <Ejercicios id={t.id} lib={lib} abrir={query.get('t') === t.id} ex={query.get('t') === t.id ? query.get('ex') : null} k={query.get('t') === t.id ? query.get('k') : null} />
          </section>
        );
      })}
    </div>
  );
}

/** Los ejercicios de un tema (si el tema se puede armar). Con `?t=&ex=&k=` se abre ese ejercicio en esa tonalidad. */
function Ejercicios({ id, lib, abrir, ex, k }: { id: string; lib: { tunes?: unknown[] }; abrir: boolean; ex: string | null; k: string | null }) {
  const prog = useMemo(() => progresionDeTema(id, lib), [id, lib]);
  // la clave hace que un enlace nuevo (otro ejercicio o tonalidad) rearme la tarjeta aunque la pantalla ya esté abierta
  return prog ? <TemaEjercicios key={`${abrir}|${ex}|${k}`} prog={prog} abierto={abrir} ejInicial={ex} keyInicial={k} /> : null;
}
