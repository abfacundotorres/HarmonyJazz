import { useMemo, useState } from 'react';
import { ChartDoc, compileDoc, docFromChart, emptyBar } from '../../content/chartDoc';
import { Library, MAX_TUNES, parseImport, type UserTune, validateTune } from '../../content/library';
import { navigate, usePersistentLibrary } from '../hooks';
import { ColeccionPanel } from './ColeccionPanel';
import { Draft, EMPTY_DRAFT, TuneLibrary } from './TuneLibrary';

/** Un tema de la colección (o de «Temas parecidos») pasa a Mis temas, sin repetir el nombre y respetando el máximo. */
export function agregarTema(tunes: readonly UserTune[], t: UserTune): { ok: false; mensaje: string } | { ok: true } {
  if (tunes.some((x) => x.name.toLowerCase() === t.name.toLowerCase())) return { ok: false, mensaje: `«${t.name}» ya está en Mis temas.` };
  if (tunes.length >= MAX_TUNES) return { ok: false, mensaje: `Llegaste al máximo de ${MAX_TUNES} temas en Mis temas.` };
  return { ok: true };
}

/**
 * Mis temas y Mi colección, en la pantalla Temas: cargar, editar, importar y exportar los temas propios, y buscar en el banco JSON.
 * El editor (grilla o texto) tiene su propio ▶ para oírlo mientras se arma; para tocarlo con loops, atril y estudio se abre en el Play-along.
 */
export function MisTemas({ buscar = '', cargarSenal = 0 }: { buscar?: string; cargarSenal?: number }) {
  const [library, setLibrary] = usePersistentLibrary();
  // temas propios: se validan al leerlos, por si el almacenamiento tiene datos dañados
  const tunes = useMemo(() => (library.tunes ?? []).map((t) => validateTune(t)).filter((t): t is UserTune => typeof t !== 'string'), [library]);
  // grilla del editor (null = el usuario eligió escribir texto); `custom` es siempre el cifrado en texto
  const [custom, setCustom] = useState('');
  const [doc, setDocState] = useState<ChartDoc | null>({ bars: [emptyBar()] });
  const [editorKey, setEditorKey] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [libMsg, setLibMsg] = useState<string | null>(null);
  const setDoc = (d: ChartDoc | null) => {
    setDocState(d);
    if (!d) return;
    // una grilla a medio armar (acorde vacío) no compila: el aviso sale al guardar
    try {
      setCustom(compileDoc(d));
    } catch {
      setCustom('');
    }
  };
  const saveTune = () => {
    const r = validateTune({ ...draft, key: draft.key || null, chart: custom, doc: doc ?? undefined, melody: tunes.find((t) => t.id === draft.id)?.melody });
    if (typeof r === 'string') return setLibMsg(r);
    const exists = tunes.some((t) => t.id === draft.id);
    if (!exists && tunes.length >= MAX_TUNES) return setLibMsg(`Llegaste al máximo de ${MAX_TUNES} temas`);
    const tune: UserTune = exists ? { ...r, id: draft.id! } : r;
    setLibrary({ tunes: exists ? tunes.map((t) => (t.id === tune.id ? tune : t)) : [...tunes, tune] });
    setLibMsg(`"${tune.name}" guardado`);
    setDraft(EMPTY_DRAFT);
    setCustom('');
    setDoc({ bars: [emptyBar()] });
    setEditorKey((k) => k + 1);
  };

  const nombresEnMisTemas = useMemo(() => new Map(tunes.map((t) => [t.name.toLowerCase(), t.id])), [tunes]);
  const agregarDeColeccion = (t: UserTune, tocar: boolean): { ok: boolean; mensaje: string } => {
    const v = agregarTema(tunes, t);
    if (!v.ok) return v;
    setLibrary({ tunes: [...tunes, t] });
    if (tocar) navigate(`/playalong?p=${encodeURIComponent(t.id)}`);
    return { ok: true, mensaje: `«${t.name}» agregado a Mis temas${tocar ? ' y listo para tocar' : ''} (${t.chart.split('|').length} compases).` };
  };
  const tocarExistente = (id: string) => navigate(`/playalong?p=${encodeURIComponent(id)}`);

  const exportTunes = () => {
    const blob = new Blob([JSON.stringify({ app: 'harmonyjazz', version: 1, tunes }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'harmonyjazz-temas.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /** Carga masiva desde texto: ya vienen validadas y sin repetidos. */
  const bulkImport = (incoming: UserTune[]) => {
    const room = Math.max(0, MAX_TUNES - tunes.length);
    const fresh = incoming.slice(0, room);
    if (fresh.length) setLibrary({ tunes: [...tunes, ...fresh] } as Library);
    setLibMsg(
      `Importados ${fresh.length} tema(s)` + (incoming.length > fresh.length ? `. Se omitieron ${incoming.length - fresh.length} por el máximo de ${MAX_TUNES} temas` : ''),
    );
  };

  const importTunes = async (file: File) => {
    if (file.size > 5_000_000) return setLibMsg('El archivo es demasiado grande');
    const { tunes: incoming, errors } = parseImport(await file.text());
    const seen = new Set(tunes.map((t) => t.name + '\u0000' + t.chart));
    const fresh = incoming.filter((t) => !seen.has(t.name + '\u0000' + t.chart)).slice(0, Math.max(0, MAX_TUNES - tunes.length));
    if (fresh.length) setLibrary({ tunes: [...tunes, ...fresh] } as Library);
    setLibMsg(
      `Importados ${fresh.length} tema(s)` +
        (incoming.length - fresh.length > 0 ? `, ${incoming.length - fresh.length} repetidos u omitidos` : '') +
        (errors.length ? `. Avisos: ${errors.slice(0, 3).join('; ')}` : ''),
    );
  };

  return (
    <>
      <TuneLibrary
        draft={draft}
        onDraft={setDraft}
        chartText={custom}
        onChartText={setCustom}
        doc={doc}
        onDoc={setDoc}
        editorKey={editorKey}
        error={null}
        tunes={tunes}
        message={libMsg}
        abrirSenal={cargarSenal}
        onSave={saveTune}
        onPlay={(t) => navigate(`/playalong?p=${encodeURIComponent(t.id)}`)}
        onEdit={(t) => {
          setDraft({ id: t.id, name: t.name, composer: t.composer, key: t.key ?? '', mode: t.mode, tempo: t.tempo, style: t.style });
          setDoc(t.doc ?? docFromChart(t.chart));
          setCustom(t.chart);
          setEditorKey((k) => k + 1);
          setLibMsg(null);
        }}
        onDelete={(t) => {
          if (!window.confirm(`¿Borrar "${t.name}"?`)) return;
          setLibrary({ tunes: tunes.filter((x) => x.id !== t.id) });
        }}
        onExport={exportTunes}
        onImport={importTunes}
        onBulkImport={bulkImport}
      />

      {/* la colección va debajo de Mis temas: es una fuente desde la que se agrega ahí */}
      <ColeccionPanel key={buscar} consultaInicial={buscar} existentes={nombresEnMisTemas} onAgregar={agregarDeColeccion} onTocar={tocarExistente} />
    </>
  );
}
