import { useEffect, useMemo, useState } from 'react';
import { Lick, lickInKey, LickLevel, parseLine } from '../../content/licks';
import { takePhraseDraft } from '../../content/phraseDraft';
import { buildPhrase, MAX_PHRASES, newPhraseId, PhraseInput, PhraseLibrary, Reading, validatePhrase } from '../../content/phrases';
import { toAbc } from '../../exercises/abc';
import { concertRange, usePersistent } from '../../state/storage';
import { CONCERT_KEYS, parseChart } from '../../theory/chart';
import { BB_TRUMPET, INTERVAL } from '../../theory/notes';
import { ExerciseCard } from '../components/ExerciseCard';
import { Notation } from '../components/Notation';
import { NotePad } from '../components/NotePad';
import { useReading, useRoute, useSettings } from '../hooks';

const LEVELS: LickLevel[] = ['Esencial', 'Intermedio', 'Avanzado'];
const emptyDraft = (reading: Reading): PhraseInput & { id?: string } => ({
  name: '', key: 'C', mode: 'major', level: 'Intermedio', tempo: 120, chart: '', line: '', idea: '', reading,
});

export function Vocab() {
  const { path, query } = useRoute();
  const { view } = useReading();
  const [lib, setLib] = usePersistent<PhraseLibrary>('phrases', { phrases: [] });
  const [draft, setDraft] = useState<(PhraseInput & { id?: string }) | null>(null);
  // una frase estimada desde Transcribir llega como borrador (en concierto) y se abre en el editor
  useEffect(() => {
    const d = takePhraseDraft();
    if (d) setDraft({ ...emptyDraft('C'), name: d.name, tempo: d.tempo, line: d.line, idea: d.idea });
  }, []);

  const phrases = useMemo(
    () => (lib.phrases ?? []).map((p) => validatePhrase(p)).filter((p): p is Lick => typeof p !== 'string'),
    [lib],
  );
  const lick = phrases.find((p) => p.id === path[1]) ?? null;

  const remove = (p: Lick) => {
    if (!window.confirm(`¿Borrar "${p.name}"?`)) return;
    setLib({ phrases: phrases.filter((x) => x.id !== p.id) });
    window.location.hash = '#/vocabulario';
  };

  return (
    <div className="page vocab">
      <section className="card">
        <h2>Vocabulario</h2>
        <p className="muted">
          Tu colección de frases. Las cargás vos, nota por nota, y la app las muestra en partitura, las toca sobre su armonía y las lleva a las 12 tonalidades.
          Se guardan sólo en este dispositivo.
        </p>
        {LEVELS.map((lv) => {
          const items = phrases.filter((l) => (l.level ?? 'Intermedio') === lv);
          return items.length ? (
            <div key={lv} className="lickgroup">
              <h4>{lv}</h4>
              <nav className="lick-list">
                {items.map((l) => (
                  <a key={l.id} href={`#/vocabulario/${l.id}`} className={l.id === lick?.id ? 'on' : ''}>
                    {l.name}
                  </a>
                ))}
              </nav>
            </div>
          ) : null;
        })}
        {phrases.length === 0 && !draft && <p className="muted">Todavía no cargaste frases.</p>}
        <p>
          <button className="primary" disabled={phrases.length >= MAX_PHRASES} onClick={() => setDraft(emptyDraft(view))}>
            + Nueva frase
          </button>
        </p>
      </section>

      {draft && (
        <PhraseEditor
          draft={draft}
          onDraft={setDraft}
          onCancel={() => setDraft(null)}
          onSave={(p) => {
            const exists = phrases.some((x) => x.id === p.id);
            setLib({ phrases: exists ? phrases.map((x) => (x.id === p.id ? p : x)) : [...phrases, p] });
            setDraft(null);
            window.location.hash = `#/vocabulario/${p.id}`;
          }}
        />
      )}

      {lick && !draft && (
        <>
          <LickCard key={lick.id} lick={lick} initialKey={query.get('k')} />
          <p className="row">
            <button
              onClick={() =>
                setDraft({ id: lick.id, name: lick.name, key: lick.key, mode: lick.mode ?? 'major', level: lick.level ?? 'Intermedio', tempo: lick.tempo ?? 120, chart: lick.chart, line: lick.line, idea: lick.idea, reading: 'C' })
              }
            >
              Editar
            </button>
            <button onClick={() => remove(lick)}>Borrar</button>
          </p>
        </>
      )}
    </div>
  );
}

function PhraseEditor({
  draft,
  onDraft,
  onCancel,
  onSave,
}: {
  draft: PhraseInput & { id?: string };
  onDraft: (d: PhraseInput & { id?: string }) => void;
  onCancel: () => void;
  onSave: (p: Lick) => void;
}) {
  const set = <K extends keyof PhraseInput>(k: K, v: PhraseInput[K]) => onDraft({ ...draft, [k]: v });
  const [tried, setTried] = useState(false);

  const built = useMemo(() => buildPhrase(draft, draft.id ?? 'nueva'), [draft]);
  const phrase = typeof built === 'string' ? null : built;
  const written = draft.reading === 'Bb';

  // vista previa: como se escribió (en Si♭ o en concierto)
  const abc = useMemo(() => {
    if (!phrase) return '';
    try {
      return toAbc(parseChart(phrase.chart), parseLine(phrase.line), {
        transpose: written ? BB_TRUMPET : INTERVAL.P1,
        key: phrase.key,
        mode: phrase.mode,
        barsPerLine: 4,
      });
    } catch {
      return '';
    }
  }, [phrase, written]);

  return (
    <section className="card library">
      <header>
        <h3>{draft.id ? 'Editar frase' : 'Nueva frase'}</h3>
      </header>
      <div className="seg" role="group" aria-label="Lectura">
        <button className={written ? 'on' : ''} onClick={() => set('reading', 'Bb')}>Escribo para trompeta (Si♭)</button>
        <button className={!written ? 'on' : ''} onClick={() => set('reading', 'C')}>Escribo en concierto</button>
      </div>
      <p className="muted small">
        Notas, cifrado y tonalidad se leen como los escribas acá. {written ? 'Si pasás de la partitura de Si♭, copiá tal cual: la app los convierte a concierto.' : ''}
      </p>

      <div className="formgrid">
        <label>
          Nombre
          <input type="text" value={draft.name} maxLength={80} onChange={(e) => set('name', e.target.value)} placeholder="Ej.: Enclosure a la 3ª" />
        </label>
        <label>
          Tonalidad del cifrado
          <select value={draft.key} onChange={(e) => set('key', e.target.value)}>
            {CONCERT_KEYS.map((k) => (
              <option key={k} value={k}>{k.replace('b', '♭')}</option>
            ))}
          </select>
        </label>
        <label>
          Modo
          <select value={draft.mode} onChange={(e) => set('mode', e.target.value as 'major' | 'minor')}>
            <option value="major">Mayor</option>
            <option value="minor">Menor</option>
          </select>
        </label>
        <label>
          Nivel
          <select value={draft.level} onChange={(e) => set('level', e.target.value as LickLevel)}>
            {LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          Tempo (♩)
          <input type="number" min={40} max={300} value={draft.tempo} onChange={(e) => set('tempo', Number(e.target.value))} />
        </label>
      </div>

      <label className="block">
        <span className="muted small">Cifrado (compases separados por <code>|</code>)</span>
        <input type="text" value={draft.chart} maxLength={2000} onChange={(e) => set('chart', e.target.value)} placeholder="Dm7 | G7 | Cmaj7 | Cmaj7" style={{ width: '100%' }} />
      </label>

      <NotePad line={draft.line} onLine={(l) => set('line', l)} />

      <label className="block">
        <span className="muted small">Notas tuyas (opcional): qué es, de dónde la sacaste, cómo practicarla</span>
        <textarea value={draft.idea} rows={2} maxLength={600} onChange={(e) => set('idea', e.target.value)} style={{ width: '100%' }} />
      </label>

      {phrase ? <Notation abc={abc} /> : (tried || draft.line.trim() || draft.chart.trim()) && <p className="muted small" role="status">{built as string}</p>}
      <div className="row">
        <button
          className="primary"
          onClick={() => {
            setTried(true);
            if (phrase) onSave(draft.id ? { ...phrase, id: draft.id } : { ...phrase, id: newPhraseId() });
          }}
        >
          Guardar frase
        </button>
        <button onClick={onCancel}>Cancelar</button>
      </div>
      {tried && !phrase && <p style={{ color: 'var(--bad)' }} role="alert">{built as string}</p>}
    </section>
  );
}

function LickCard({ lick, initialKey }: { lick: Lick; initialKey: string | null }) {
  const [settings] = useSettings();
  const [key, setKey] = useState(initialKey ?? lick.key);
  const { chart, notes } = useMemo(() => lickInKey(lick, key, concertRange(settings.register)), [lick, key, settings.register]);
  const mode = lick.mode ?? (/m7b5|m6/.test(lick.chart) ? 'minor' : 'major');
  return (
    <ExerciseCard
      id={`lick:${lick.id}`}
      title={lick.name}
      description={lick.idea || undefined}
      chart={chart}
      notes={notes}
      keyValue={key}
      mode={mode}
      onKey={setKey}
      tempo={lick.tempo ?? 130}
    />
  );
}
