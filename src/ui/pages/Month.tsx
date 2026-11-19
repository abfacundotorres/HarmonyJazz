import { useMemo, useState } from 'react';
import { type Focus, LANG_FOCI, REPERTOIRE_WEEKS, TECH_FOCI, WEEKS } from '../../content/focus';
import { monthActive, monthName, monthOf, repertoireName, sessionNumber } from '../../content/monthPlan';
import { PROGRESSIONS } from '../../content/progressions';
import { dayNum } from '../../state/progress';
import { useLog, useMonth, usePersistentLibrary } from '../hooks';
import { navigate } from '../hooks';

/** Los temas propios guardados (sólo id y nombre, descartando lo que no tenga la forma esperada). */
const userTunes = (lib: { tunes?: unknown[] }) =>
  (lib.tunes ?? []).flatMap((t) => {
    const x = t as { id?: unknown; name?: unknown } | null;
    return x && typeof x.id === 'string' && typeof x.name === 'string' ? [{ id: x.id, name: x.name }] : [];
  });

function FocusPicker({ legend, foci, value, onChange }: { legend: string; foci: Focus[]; value: string; onChange: (id: string) => void }) {
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
  const [editing, setEditing] = useState(!active);
  const [tech, setTech] = useState(mp.tech || TECH_FOCI[0].id);
  const [lang, setLang] = useState(mp.lang || LANG_FOCI[0].id);
  const [rep, setRep] = useState(repertoireName(mp.rep, tunes) !== null ? mp.rep : (tunes[0]?.id ?? 'ii-v-i'));
  const repName = repertoireName(rep, tunes) ?? '';
  const weeksRep = useMemo(() => REPERTOIRE_WEEKS(repName || 'el tema'), [repName]);
  const session = active ? sessionNumber(log, mp.startDay, dayNum(today)) : 0;
  // un mes anterior con focos válidos: se puede seguir con los mismos
  const lastMonth = !active && mp.month !== '' && mp.month !== monthOf(today);

  const start = (t = tech, l = lang, r = rep) => {
    setMp({ month: monthOf(today), tech: t, lang: l, rep: r, startDay: dayNum(today) });
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
          <p className="muted">Vas por la sesión {session}. Cada sesión trabaja un solo foco, técnica o lenguaje alternando, y cada semana trae tres tareas por foco; el repertorio acompaña todos los días. Después de 24 sesiones se repite la última semana para consolidar.</p>
          <div className="row">
            <a className="button primary" href="#/hoy">Ir al plan de hoy</a>
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
          <FocusPicker legend="Técnica" foci={TECH_FOCI} value={tech} onChange={setTech} />
          <FocusPicker legend="Lenguaje" foci={LANG_FOCI} value={lang} onChange={setLang} />

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
