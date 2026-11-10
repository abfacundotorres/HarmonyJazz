import { useRef, useState } from 'react';
import { STYLE_LABEL, Style } from '../../audio/engine';
import { ChartDoc, compileDoc, docFromChart } from '../../content/chartDoc';
import { BulkEntry, MAX_CHART_CHARS, parseBulk, UserTune } from '../../content/library';
import { CONCERT_KEYS } from '../../theory/chart';
import { useReading } from '../hooks';
import { ChartEditor } from './ChartEditor';

export interface Draft {
  /** Si está, se edita un tema existente. */
  id?: string;
  name: string;
  composer: string;
  key: string;
  mode: 'major' | 'minor';
  tempo: number;
  style: Style;
}

const docFromText = (t: string): ChartDoc => docFromChart(t);
/** Texto plano de una grilla; si tiene errores se conserva lo escrito sin desplegar. */
const unrolledText = (d: ChartDoc): string => {
  try {
    return compileDoc(d);
  } catch {
    return d.bars.map((b) => b.chords.join(' ')).join(' | ');
  }
};

export const EMPTY_DRAFT: Draft = { name: '', composer: '', key: '', mode: 'major', tempo: 120, style: 'swing' };

/** Formulario y lista de temas propios: cargar, probar, guardar, editar, borrar, exportar e importar. */
export function TuneLibrary({
  draft,
  onDraft,
  chartText,
  onChartText,
  doc,
  onDoc,
  editorKey,
  error,
  tunes,
  onTry,
  onSave,
  onPlay,
  onEdit,
  onDelete,
  onExport,
  onImport,
  onBulkImport,
  message,
}: {
  draft: Draft;
  onDraft: (d: Draft) => void;
  chartText: string;
  onChartText: (t: string) => void;
  /** Grilla en edición (null = modo texto). */
  doc: ChartDoc | null;
  onDoc: (d: ChartDoc | null) => void;
  /** Cambia al cargar otro tema, para reiniciar el deshacer del editor. */
  editorKey: number;
  error: string | null;
  tunes: UserTune[];
  onTry: () => void;
  onSave: () => void;
  onPlay: (t: UserTune) => void;
  onEdit: (t: UserTune) => void;
  onDelete: (t: UserTune) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onBulkImport: (tunes: UserTune[]) => void;
  message: string | null;
}) {
  const { keyLabel } = useReading();
  const file = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => onDraft({ ...draft, [k]: v });

  return (
    <section className="card library">
      <details open={open || !!draft.id} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
        <summary>
          Mis temas ({tunes.length}) · cargar un cifrado propio
        </summary>
        <p className="muted small">
          Armá el tema en la <b>grilla</b> (como iReal Pro: compases, secciones, repeticiones y finales 1.º/2.º) o pegá el cifrado como <b>texto</b>
          (compases separados por <code>|</code>, <code>%</code> repite el compás anterior). Escribilos en <b>concierto</b>. Se guardan sólo en este dispositivo.
        </p>

        <div className="formgrid">
          <label>
            Nombre
            <input type="text" value={draft.name} maxLength={80} onChange={(e) => set('name', e.target.value)} placeholder="Ej.: Autumn Leaves" />
          </label>
          <label>
            Compositor (opcional)
            <input type="text" value={draft.composer} maxLength={80} onChange={(e) => set('composer', e.target.value)} />
          </label>
          <label>
            Tonalidad del cifrado
            <select value={draft.key} onChange={(e) => set('key', e.target.value)}>
              <option value="">Sin una tonalidad fija</option>
              {CONCERT_KEYS.map((k) => (
                <option key={k} value={k}>{k} (concierto){keyLabel(k) !== k ? ` · escrito ${keyLabel(k)}` : ''}</option>
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
            Tempo
            <input type="number" min={40} max={320} value={draft.tempo} onChange={(e) => set('tempo', Number(e.target.value))} />
          </label>
          <label>
            Estilo
            <select value={draft.style} onChange={(e) => set('style', e.target.value as Style)}>
              {(Object.keys(STYLE_LABEL) as Style[]).map((s) => (
                <option key={s} value={s}>{STYLE_LABEL[s]}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="seg" role="group" aria-label="Forma de cargar el cifrado">
          <button className={doc ? 'on' : ''} onClick={() => onDoc(docFromText(chartText))}>Grilla</button>
          <button className={!doc ? 'on' : ''} onClick={() => { if (doc) { onChartText(unrolledText(doc)); onDoc(null); } }}>Texto</button>
        </div>
        {doc ? (
          <ChartEditor key={editorKey} doc={doc} onChange={onDoc} />
        ) : (
          <textarea
            rows={5}
            value={chartText}
            maxLength={MAX_CHART_CHARS}
            onChange={(e) => onChartText(e.target.value)}
            placeholder={'Cm7 | Cm7 | Fm7 | Fm7 | Dm7b5 | G7alt | Cm7 | %'}
            aria-label="Cifrado"
          />
        )}
        {error && <p className="error">{error}</p>}
        <div className="row">
          <button onClick={onTry}>Probar sin guardar</button>
          <button className="primary" onClick={onSave}>{draft.id ? 'Guardar cambios' : 'Guardar tema'}</button>
          {draft.id && <button onClick={() => { onDraft(EMPTY_DRAFT); onChartText(''); onDoc({ bars: [{ chords: [''] }] }); }}>Cancelar edición</button>}
        </div>
        {message && <p className="muted small" role="status">{message}</p>}

        {tunes.length > 0 && (
          <ul className="tunelist">
            {tunes.map((t) => (
              <li key={t.id}>
                <span>
                  <b>{t.name}</b>
                  {t.composer && <small className="muted"> · {t.composer}</small>}
                  <small className="muted"> · {t.key ? `${t.key} ${t.mode === 'minor' ? 'menor' : ''}`.trim() : 'sin tonalidad'} · {t.tempo} bpm</small>
                </span>
                <span className="row">
                  <button onClick={() => onPlay(t)}>Tocar</button>
                  <button onClick={() => onEdit(t)}>Editar</button>
                  <button onClick={() => onDelete(t)} aria-label={`Borrar ${t.name}`}>Borrar</button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="row">
          <button onClick={onExport} disabled={tunes.length === 0}>Exportar mis temas (.json)</button>
          <button onClick={() => file.current?.click()}>Importar…</button>
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImport(f);
              e.target.value = '';
            }}
          />
        </div>
        <BulkImport existing={tunes} onImport={onBulkImport} />

        <p className="muted small">
          Los temas viven en el almacenamiento de este navegador: si borrás los datos del sitio, se pierden. Exportalos para tener una copia o llevarlos a otro dispositivo.
        </p>
      </details>
    </section>
  );
}

const EXAMPLE = `# Autumn Leaves
compositor: J. Kosma
tonalidad: G menor
tempo: 140
estilo: swing
[A] Cm7 | F7 | Bbmaj7 | Ebmaj7 |
Am7b5 | D7 | Gm | %
[B] Am7b5 | D7 | Gm | % |
Cm7 | F7 | Bbmaj7 | Ebmaj7

# Blue Bossa
tonalidad: C menor
estilo: bossa
Cm7 | % | Fm7 | % | Dm7b5 | G7 | Cm7 | %`;

/** Carga masiva: pegar o subir un texto con varios temas, revisar y recién ahí importar. */
function BulkImport({ existing, onImport }: { existing: UserTune[]; onImport: (t: UserTune[]) => void }) {
  const [text, setText] = useState('');
  const [entries, setEntries] = useState<BulkEntry[] | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const seen = new Set(existing.map((t) => t.name + '\u0000' + t.chart));
  const status = (e: BulkEntry) => (e.error ? 'error' : e.tune && seen.has(e.tune.name + '\u0000' + e.tune.chart) ? 'dup' : 'ok');
  const importable = (entries ?? []).filter((e) => status(e) === 'ok');

  const review = (t: string) => {
    setEntries(t.trim() ? parseBulk(t) : null);
  };

  return (
    <details className="bulk">
      <summary>Carga masiva: muchos temas de una vez</summary>
      <p className="muted small">
        Pegá un texto o subí un archivo <code>.txt</code>. Cada tema empieza con una línea <code>#</code> y su nombre; los datos opcionales van en líneas
        <code> tonalidad:</code>, <code>tempo:</code>, <code>estilo:</code> y <code>compositor:</code>; los saltos de línea separan compases. Escribí el cifrado
        <b> expandido</b> (sin repeticiones ni finales 1ª/2ª) y en <b>concierto</b>. Los cifrados se revisan antes de importar.
      </p>
      <details>
        <summary className="small">Ver un ejemplo</summary>
        <pre className="example">{EXAMPLE}</pre>
        <button onClick={() => { setText(EXAMPLE); review(EXAMPLE); }}>Usar este ejemplo</button>
      </details>
      <textarea
        rows={8}
        value={text}
        onChange={(e) => { setText(e.target.value); setEntries(null); }}
        placeholder={'# Nombre del tema\ntonalidad: Bb\nBbmaj7 | G7 | Cm7 | F7 | ...'}
        aria-label="Texto con varios temas"
      />
      <div className="row">
        <button className="primary" onClick={() => review(text)} disabled={!text.trim()}>Revisar</button>
        <button onClick={() => file.current?.click()}>Subir archivo…</button>
        <input
          ref={file}
          type="file"
          accept=".txt,.md,text/plain"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            if (f.size > 2_000_000) return setFileError('El archivo es demasiado grande (máximo 2 MB de texto)');
            setFileError(null);
            const t = await f.text();
            setText(t);
            review(t);
          }}
        />
      </div>
      {fileError && <p className="error">{fileError}</p>}

      {entries && (
        <>
          <p role="status">
            <b>{importable.length}</b> para importar
            {entries.filter((e) => status(e) === 'dup').length > 0 && <> · {entries.filter((e) => status(e) === 'dup').length} ya existen</>}
            {entries.filter((e) => status(e) === 'error').length > 0 && <> · <span className="error">{entries.filter((e) => status(e) === 'error').length} con errores</span></>}
          </p>
          <ul className="bulklist">
            {entries.map((e, i) => (
              <li key={i} className={status(e)}>
                <span className="mark" aria-hidden>{status(e) === 'ok' ? '✓' : status(e) === 'dup' ? '＝' : '✕'}</span>
                <span>
                  <b>{e.name || '(sin nombre)'}</b>
                  <small className="muted"> · línea {e.line}{e.bars ? ` · ${e.bars} compases` : ''}{e.tune?.key ? ` · ${e.tune.key}${e.tune.mode === 'minor' ? ' menor' : ''}` : ''}</small>
                  {status(e) === 'dup' && <small className="muted"> · ya está en tus temas, se omite</small>}
                  {e.error && <small className="error"> · {e.error}</small>}
                  {e.notes.map((n, k) => <small key={k} className="muted block">{n}</small>)}
                </span>
              </li>
            ))}
          </ul>
          <div className="row">
            <button
              className="primary"
              disabled={importable.length === 0}
              onClick={() => {
                onImport(importable.map((e) => e.tune!));
                setEntries(null);
                setText('');
              }}
            >
              Importar {importable.length} tema{importable.length === 1 ? '' : 's'}
            </button>
            <button onClick={() => setEntries(null)}>Seguir editando</button>
          </div>
        </>
      )}
    </details>
  );
}
