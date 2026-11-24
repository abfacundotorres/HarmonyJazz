import { useMemo, useState } from 'react';
import { missingBefore, nextFocus, stagesOf, stepOf } from '../../content/camino';
import { siguiente } from '../../content/curricula';
import { formaDe, nivelDe, nombreForma } from '../../content/standards';
import { focusById, type Focus, LANG_FOCI, TECH_FOCI, WEEKS } from '../../content/focus';
import { monthActive, monthName, monthOf, pickFor, repertoireName, sesionDelMes, sessionNumber } from '../../content/monthPlan';
import { repertoireWeeks } from '../../content/standards';
import { PROGRESSIONS } from '../../content/progressions';
import { dayNum } from '../../state/progress';
import { usePersistent } from '../../state/storage';
import { useCurricula, useLog, useMonth, usePersistentLibrary } from '../hooks';
import { userTunes } from '../repertorioTemas';
import { navigate } from '../hooks';

function FocusPicker({ legend, foci, value, onChange, done, next }: { legend: string; foci: Focus[]; value: string; onChange: (id: string) => void; done: ReadonlySet<string>; next: string | null }) {
  return (
    <fieldset className="focuspick">
      <legend>{legend}</legend>
      {foci.map((f) => (
        <div key={f.id} className={`focuscard ${f.id === value ? 'on' : ''}`}>
          <div className="pick">
            <input id={`f-${f.id}`} type="radio" name={legend} checked={f.id === value} onChange={() => onChange(f.id)} />
            <label htmlFor={`f-${f.id}`}>
              <b>{f.title}</b>
              <small>{f.summary}</small>
              <PathTag id={f.id} done={done} next={next} />
            </label>
          </div>
          <details>
            <summary>Recorrido de {WEEKS} semanas</summary>
            <Outline weeks={f.weeks} />
          </details>
        </div>
      ))}
    </fieldset>
  );
}

/** Etapa del foco en el camino y, si falta, qué conviene tener antes. */
function PathTag({ id, done, next }: { id: string; done: ReadonlySet<string>; next: string | null }) {
  const st = stepOf(id);
  if (!st) return null;
  const falta = missingBefore(id, done).map((a) => focusById(a)?.title ?? a);
  return (
    <small className={`pathtag ${falta.length ? 'warn' : ''}`}>
      {id === next && <b>Sugerido · </b>}
      {done.has(id) ? 'Ya trabajado' : `Etapa ${st.stage}`}
      {falta.length > 0 && !done.has(id) ? ` · antes conviene: ${falta.join(', ')}` : ''}
    </small>
  );
}

function PathCard({ area, done, toggle, next, use }: { area: Focus['area']; done: ReadonlySet<string>; toggle: (id: string) => void; next: string | null; use: (id: string) => void }) {
  return (
    <div>
      {stagesOf(area).map((g) => (
        <section key={g.stage} aria-label={`Etapa ${g.stage}: ${g.title}`}>
          <h4>Etapa {g.stage}: {g.title}</h4>
          <ul className="pathlist">
            {g.steps.map((st) => {
              const f = focusById(st.id);
              if (!f) return null;
              const falta = missingBefore(st.id, done);
              return (
                <li key={st.id} className={st.id === next ? 'next' : ''}>
                  <label>
                    <input type="checkbox" checked={done.has(st.id)} onChange={() => toggle(st.id)} aria-label={`Ya trabajé: ${f.title}`} /> <b>{f.title}</b>
                  </label>
                  <small>
                    {st.why}
                    {falta.length > 0 && !done.has(st.id) ? ` Antes conviene: ${falta.map((a) => focusById(a)?.title ?? a).join(', ')}.` : ''}
                  </small>
                  {!done.has(st.id) && <button onClick={() => use(st.id)}>Elegir este</button>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Outline({ weeks }: { weeks: { title: string; goal: string; tasks: { id: string; short: string }[] }[] }) {
  return (
    <ol className="outline">
      {weeks.map((w, i) => (
        <li key={i}>
          <b>Semana {i + 1}: {w.title}.</b> {w.goal}
          <ul>
            {w.tasks.map((t) => (
              <li key={t.id}>{t.short}</li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

/** Mi mes: se eligen al empezar el mes un foco de técnica, uno de lenguaje y un tema de repertorio. */
export function Month() {
  const [mp, setMp] = useMonth();
  const [log] = useLog();
  const [lib] = usePersistentLibrary();
  const tunes = useMemo(() => userTunes(lib), [lib]);
  const today = useMemo(() => new Date(), []);
  const active = monthActive(mp, today, tunes);
  const [prog, setProg] = useCurricula();
  const sig = siguiente(prog);
  const [camino, setCamino] = usePersistent<{ done: string[] }>('camino', { done: [] });
  const done = useMemo(() => new Set(camino.done), [camino]);
  const nextTech = nextFocus('tecnica', done);
  const nextLang = nextFocus('lenguaje', done);
  const toggleDone = (id: string) => setCamino((c) => ({ done: c.done.includes(id) ? c.done.filter((x) => x !== id) : [...c.done, id] }));
  const [editing, setEditing] = useState(!active);
  const [tech, setTech] = useState(mp.tech || sig?.tech || nextTech || TECH_FOCI[0].id);
  const [lang, setLang] = useState(mp.lang || sig?.lang || nextLang || LANG_FOCI[0].id);
  const [rep, setRep] = useState(repertoireName(mp.rep, tunes) !== null ? mp.rep : (sig ? formaDe(sig.n) : (tunes[0]?.id ?? 'ii-v-i')));
  const repName = repertoireName(rep, tunes) ?? '';
  const weeksRep = useMemo(() => repertoireWeeks(repName || 'el tema', sig && sig.tech === tech && sig.lang === lang ? sig.sem : undefined), [repName, sig, tech, lang]);
  const session = active ? sesionDelMes(log, mp, dayNum(today)) : 0;
  const automatica = active ? sessionNumber(log, mp.startDay, dayNum(today)) : 0;
  /** Corrige a mano en qué sesión se está (la sesión nunca baja de 1). */
  const moverSesion = (paso: number) => {
    const ajuste = Math.max(-50, Math.min(50, session + paso - automatica));
    setMp({ ...mp, ajuste: ajuste === 0 ? undefined : ajuste });
  };
  // un mes anterior con focos válidos: se puede seguir con los mismos
  const lastMonth = !active && mp.month !== '' && mp.month !== monthOf(today);

  const start = (t = tech, l = lang, r = rep) => {
    // un mes anterior con ocho sesiones o más cuenta como foco trabajado en el camino
    if (mp.month !== '' && focusById(mp.tech) && focusById(mp.lang) && session >= 9 && (mp.month !== monthOf(today) || mp.tech !== t || mp.lang !== l)) {
      setCamino((c) => ({ done: [...new Set([...c.done, mp.tech, mp.lang])] }));
    }
    setMp({ month: monthOf(today), tech: t, lang: l, rep: r, startDay: dayNum(today), nivel: sig && sig.tech === t && sig.lang === l ? sig.sem : undefined });
    // si son los de la materia que toca en la currícula, queda en curso
    if (sig && sig.tech === t && sig.lang === l) setProg((p) => ({ ...p, actual: sig.n }));
    setEditing(false);
    navigate('#/hoy');
  };
  const forms = PROGRESSIONS.filter((p) => p.category !== 'Mis temas');

  return (
    <div className="page month">
      {active && !editing && (
        <section className="card">
          <h2>Tu mes: {monthName(mp.month)}</h2>
          <ul className="monthsum">
            <li><span className="lbl">Técnica</span><b>{TECH_FOCI.concat(LANG_FOCI).find((f) => f.id === mp.tech)?.title}</b></li>
            <li><span className="lbl">Lenguaje</span><b>{LANG_FOCI.find((f) => f.id === mp.lang)?.title}</b></li>
            <li><span className="lbl">Repertorio</span><b>{repertoireName(mp.rep, tunes)}</b></li>
          </ul>
          <div className="sesionmes">
            <span className="lbl">Dónde vas</span>
            <b>Semana {pickFor(session).week + 1} de 4 · sesión {session}</b>
            <span className="row" role="group" aria-label="Corregir la sesión">
              <button onClick={() => moverSesion(-1)} disabled={session <= 1} aria-label="Una sesión antes">− sesión</button>
              <button onClick={() => moverSesion(1)} aria-label="Una sesión después">+ sesión</button>
              {mp.ajuste ? <button onClick={() => setMp({ ...mp, ajuste: undefined })}>Volver al cálculo automático (sesión {automatica})</button> : null}
            </span>
          </div>
          <p className="muted">La sesión se cuenta sola: un día cuenta si abriste Hoy. Si te saltaste días o querés repetir, corregila acá. Cada sesión trabaja un solo foco, técnica o lenguaje alternando, y cada semana trae tres tareas por foco; el repertorio acompaña todos los días. Después de 24 sesiones se repite la última semana para consolidar.</p>
          <div className="row">
            <a className="button primary" href="#/hoy">Ir al plan</a>
            <a className="button" href="#/curricula">Currícula</a>
            <button onClick={() => setEditing(true)}>Cambiar los focos</button>
          </div>
        </section>
      )}

      {(editing || !active) && (
        <section className="card">
          <h2>{active ? 'Cambiar los focos' : 'Elegí los focos de este mes'}</h2>
          <p className="muted">
            En vez de rotar todo cada día, elegís pocas cosas y las trabajás a fondo: cada una es un recorrido de {WEEKS} semanas con tareas chicas
            que se alternan. Cada día Hoy trae el calentamiento, un solo foco (técnica o lenguaje, alternando) y el tema, sin apuros: lo que haga falta para hacerlo bien.
          </p>
          {lastMonth && (
            <p className="notice" role="status">
              <span>Empezó un mes nuevo. ¿Seguís con los mismos focos ({TECH_FOCI.concat(LANG_FOCI).find((f) => f.id === mp.tech)?.title}, {LANG_FOCI.find((f) => f.id === mp.lang)?.title})?</span>{' '}
              <button onClick={() => start(mp.tech, mp.lang, mp.rep)} disabled={repertoireName(mp.rep, tunes) === null}>Seguir con los mismos</button>
            </p>
          )}
          {sig && (
            <div className="notice" role="status">
              <span>
                <b>Currícula · mes {sig.n}: {sig.name}.</b> Técnica: {focusById(sig.tech)?.title} · Lenguaje: {focusById(sig.lang)?.title}. Tema sugerido: {nombreForma(sig.n)}. Standards de este nivel ({nivelDe(sig.sem)?.tipo.toLowerCase()}), para cargar en Mis temas: {nivelDe(sig.sem)?.ejemplos.join(', ')}. <a href="#/curricula">Ver la currícula</a>
              </span>{' '}
              <button onClick={() => { setTech(sig.tech); setLang(sig.lang); setRep(formaDe(sig.n)); }}>Usar la materia</button>
            </div>
          )}
          <div className="notice" role="status">
            <span>
              <b>Camino sugerido:</b> {nextTech ? `Técnica: ${focusById(nextTech)?.title}` : 'Técnica: recorrido completo'} · {nextLang ? `Lenguaje: ${focusById(nextLang)?.title}` : 'Lenguaje: recorrido completo'}.
            </span>{' '}
            <button onClick={() => { if (nextTech) setTech(nextTech); if (nextLang) setLang(nextLang); }} disabled={!nextTech && !nextLang}>Usar lo sugerido</button>
          </div>
          <details className="info">
            <summary>Ver el camino completo</summary>
            <p className="muted small">
              Un orden con lógica de currículo: primero la base (sonido, tríadas), después acordes y guide tones, después vocabulario y al final lo que se apoya en todo eso. Tildá lo que ya trabajaste; es sólo una sugerencia y podés elegir cualquier foco.
            </p>
            <h3>Técnica</h3>
            <PathCard area="tecnica" done={done} toggle={toggleDone} next={nextTech} use={setTech} />
            <h3>Lenguaje</h3>
            <PathCard area="lenguaje" done={done} toggle={toggleDone} next={nextLang} use={setLang} />
          </details>
          <FocusPicker legend="Técnica" foci={TECH_FOCI} value={tech} onChange={setTech} done={done} next={nextTech} />
          <FocusPicker legend="Lenguaje" foci={LANG_FOCI} value={lang} onChange={setLang} done={done} next={nextLang} />

          <fieldset className="focuspick">
            <legend>Repertorio</legend>
            <label className="block">
              Tema del mes
              <select aria-label="Tema de repertorio" value={rep} onChange={(e) => setRep(e.target.value)}>
                {tunes.length > 0 && (
                  <optgroup label="Mis temas">
                    {tunes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Formas incluidas">
                  {forms.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
              </select>
            </label>
            <p className="muted small">
              {tunes.length === 0
                ? 'La app no trae temas de terceros: para trabajar uno (por ejemplo "Autumn Leaves") cargá su cifrado en Play-along → Mis temas, y aparece acá. Mientras tanto podés elegir una forma incluida.'
                : 'El recorrido de repertorio es el mismo para cualquier tema: forma y armonía, melodía, improvisar y grabar.'}
            </p>
            <details>
              <summary>Recorrido de {WEEKS} semanas del repertorio</summary>
              <Outline weeks={weeksRep} />
            </details>
          </fieldset>

          <div className="row">
            <button className="primary" onClick={() => start()}>Empezar el mes con estos focos</button>
            {active && <button onClick={() => setEditing(false)}>Cancelar</button>}
          </div>
          <p className="muted small">Cambiar los focos a mitad de mes reinicia el recorrido desde la sesión 1.</p>
        </section>
      )}
    </div>
  );
}
