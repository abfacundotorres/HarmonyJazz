import { cierre, correlativas, faltan, type Materia, PLAN, SEMESTERS, siguiente } from '../../content/curricula';
import { focusById } from '../../content/focus';
import { formaDe, nivelDe, nombreForma } from '../../content/standards';
import { monthOf } from '../../content/monthPlan';
import { dayNum } from '../../state/progress';
import { usePersistent } from '../../state/storage';
import { navigate, useCurricula, useMonth } from '../hooks';

const KIND_LABEL = { materia: 'Materia', taller: 'Taller', integracion: 'Integración' } as const;

/** La currícula de tres años: seis semestres, una materia por mes, con correlativas y cierre con autoevaluación. */
export function Curricula() {
  const [prog, setProg] = useCurricula();
  const [, setMp] = useMonth();
  const [, setCamino] = usePersistent<{ done: string[] }>('camino', { done: [] });
  const sig = siguiente(prog);
  const hechas = prog.aprobadas.length;

  const aprobar = (m: Materia) => {
    setProg((p) => ({ ...p, aprobadas: [...new Set([...p.aprobadas, m.n])], actual: p.actual === m.n ? null : p.actual }));
    setCamino((c) => ({ done: [...new Set([...c.done, m.lang, m.tech])] }));
  };
  const reabrir = (m: Materia) => setProg((p) => ({ ...p, aprobadas: p.aprobadas.filter((n) => n !== m.n) }));
  const tildar = (m: Materia, i: number) =>
    setProg((p) => {
      const cur = p.checks[String(m.n)] ?? [];
      return { ...p, checks: { ...p.checks, [String(m.n)]: cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i] } };
    });
  const empezar = (m: Materia) => {
    setMp({ month: monthOf(new Date()), tech: m.tech, lang: m.lang, rep: formaDe(m.n), startDay: dayNum(), nivel: m.sem });
    setProg((p) => ({ ...p, actual: m.n }));
    navigate('#/hoy');
  };

  return (
    <div className="page curricula">
      <section className="card">
        <h2>Currícula de tres años</h2>
        <p className="muted">
          Seis semestres de seis meses; cada mes es una materia con un foco de lenguaje y uno de técnica, sus correlativas y un cierre con autoevaluación. El último mes de cada semestre integra lo visto. Mi mes ya viene con la materia que te toca.
        </p>
        <p>
          <b>{hechas} de {PLAN.length}</b> materias aprobadas.{' '}
          {sig ? <>Te toca: <b>mes {sig.n}, {sig.name}</b>.</> : 'Terminaste la currícula.'}
        </p>
        <progress max={PLAN.length} value={hechas} aria-label="Materias aprobadas" />
      </section>

      {SEMESTERS.map((s) => {
        const ms = PLAN.filter((m) => m.sem === s.sem);
        const ok = ms.filter((m) => prog.aprobadas.includes(m.n)).length;
        return (
          <details key={s.sem} className="card semester" open={!!sig && sig.sem === s.sem}>
            <summary>
              <b>{s.year}.º año · {s.sem % 2 === 1 ? '1.er' : '2.º'} semestre: {s.title}</b> <span className="muted small">{ok}/{ms.length}</span>
            </summary>
            <p className="muted small">{s.goal}</p>
            <ol className="materias">
              {ms.map((m) => (
                <MateriaRow key={m.n} m={m} prog={prog} esSig={sig?.n === m.n} actual={prog.actual === m.n} onTildar={tildar} onAprobar={aprobar} onReabrir={reabrir} onEmpezar={empezar} />
              ))}
            </ol>
          </details>
        );
      })}
    </div>
  );
}

function MateriaRow({ m, prog, esSig, actual, onTildar, onAprobar, onReabrir, onEmpezar }: { m: Materia; prog: ReturnType<typeof useCurricula>[0]; esSig: boolean; actual: boolean; onTildar: (m: Materia, i: number) => void; onAprobar: (m: Materia) => void; onReabrir: (m: Materia) => void; onEmpezar: (m: Materia) => void }) {
  const aprobada = prog.aprobadas.includes(m.n);
  const crit = cierre(m);
  const marks = prog.checks[String(m.n)] ?? [];
  const todo = crit.every((_, i) => marks.includes(i));
  const falta = faltan(m, prog);
  const estado = aprobada ? 'Aprobada' : actual ? 'En curso' : esSig ? 'Te toca' : '';
  return (
    <li className={`materia ${aprobada ? 'ok' : ''} ${esSig ? 'next' : ''}`} value={m.n}>
      <details>
        <summary>
          <b>Mes {m.n} · {m.name}</b> <span className="muted small">{KIND_LABEL[m.kind]}{estado ? ` · ${estado}` : ''}</span>
        </summary>
        <p className="muted small">{m.goal}</p>
        <p className="small">
          Lenguaje: <b>{focusById(m.lang)?.title}</b> · Técnica: <b>{focusById(m.tech)?.title}</b>
        </p>
        <p className="small">
          Tema sugerido: <b>{nombreForma(m.n)}</b>. Para llevarlo a un standard ({nivelDe(m.sem)?.tipo.toLowerCase()}), cargá el cifrado de tu libro en Temas → Mis temas; por ejemplo {nivelDe(m.sem)?.ejemplos.join(', ')}.
        </p>
        {correlativas(m).length > 0 && (
          <p className="small">
            Correlativas: {correlativas(m).map((c) => `${c.name}${prog.aprobadas.includes(c.n) ? ' ✓' : ''}`).join(', ')}.
            {falta.length > 0 && !aprobada ? ' Te faltan algunas, pero podés cursarla igual.' : ''}
          </p>
        )}
        {!aprobada && (
          <>
            <fieldset className="cierre">
              <legend>Cierre: ¿lo lográs?</legend>
              {crit.map((c, i) => (
                <label key={i} className="check">
                  <input type="checkbox" checked={marks.includes(i)} onChange={() => onTildar(m, i)} /> {c}
                </label>
              ))}
            </fieldset>
            <div className="row">
              <button onClick={() => onEmpezar(m)}>Empezar este mes</button>
              <button className="primary" disabled={!todo} onClick={() => onAprobar(m)}>Aprobar la materia</button>
              <button onClick={() => onAprobar(m)}>Ya la domino (saltear)</button>
            </div>
          </>
        )}
        {aprobada && <button onClick={() => onReabrir(m)}>Volver a cursarla</button>}
      </details>
    </li>
  );
}
