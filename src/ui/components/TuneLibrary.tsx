import { useRef, useState } from 'react';
import { STYLE_LABEL, Style } from '../../audio/engine';
import { MAX_CHART_CHARS, UserTune } from '../../content/library';
import { CONCERT_KEYS } from '../../theory/chart';
import { useReading } from '../hooks';

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

export const EMPTY_DRAFT: Draft = { name: '', composer: '', key: '', mode: 'major', tempo: 120, style: 'swing' };

/** Formulario y lista de temas propios: cargar, probar, guardar, editar, borrar, exportar e importar. */
export function TuneLibrary({
  draft,
  onDraft,
  chartText,
  onChartText,
  error,
  tunes,
  onTry,
  onSave,
  onPlay,
  onEdit,
  onDelete,
  onExport,
  onImport,
  message,
}: {
  draft: Draft;
  onDraft: (d: Draft) => void;
  chartText: string;
  onChartText: (t: string) => void;
  error: string | null;
  tunes: UserTune[];
  onTry: () => void;
  onSave: () => void;
  onPlay: (t: UserTune) => void;
  onEdit: (t: UserTune) => void;
  onDelete: (t: UserTune) => void;
  onExport: () => void;
  onImport: (file: File) => void;
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
          Copiá los cifrados de tu libro: compases separados por <code>|</code>, acordes por espacio, <code>%</code> repite el compás anterior.
          Se limpian secciones como <code>[A]</code>, repeticiones y saltos de línea. Escribilos en <b>concierto</b>. Se guardan sólo en este dispositivo.
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

        <textarea
          rows={5}
          value={chartText}
          maxLength={MAX_CHART_CHARS}
          onChange={(e) => onChartText(e.target.value)}
          placeholder={'Cm7 | Cm7 | Fm7 | Fm7 | Dm7b5 | G7alt | Cm7 | %'}
          aria-label="Cifrado"
        />
        {error && <p className="error">{error}</p>}
        <div className="row">
          <button onClick={onTry}>Probar sin guardar</button>
          <button className="primary" onClick={onSave}>{draft.id ? 'Guardar cambios' : 'Guardar tema'}</button>
          {draft.id && <button onClick={() => { onDraft(EMPTY_DRAFT); onChartText(''); }}>Cancelar edición</button>}
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
        <p className="muted small">
          Los temas viven en el almacenamiento de este navegador: si borrás los datos del sitio, se pierden. Exportalos para tener una copia o llevarlos a otro dispositivo.
        </p>
      </details>
    </section>
  );
}
