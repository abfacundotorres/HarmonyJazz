import { useEffect, useState } from 'react';
import { applyLocal, backupFileName, buildBackup, collectLocal, daysSinceBackup, hasData, markBackup, parseBackup, summarize, Summary } from '../../state/backup';
import { compartirArchivo, estadoProteccion, pedirProteccion, type Proteccion, puedeCompartirArchivo } from '../../state/persist';
import { getBlob, listTracks, normalizeMeta, saveMeta } from '../../transcribe/audioStore';

/** Copia de seguridad: guarda y restaura temas, frases, progreso, ajustes y fichas de los audios. */
export function BackupCard({ onSaved }: { onSaved?: () => void } = {}) {
  const [msg, setMsg] = useState('');
  const [days, setDays] = useState<number | null>(() => daysSinceBackup(localStorage));
  const [info, setInfo] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(false);
  const [prot, setProt] = useState<Proteccion>('nodisponible');
  const [canShare] = useState(() => puedeCompartirArchivo(navigator, new File(['{}'], 'copia.json', { type: 'application/json' })));

  useEffect(() => {
    void estadoProteccion().then(setProt);
  }, []);

  useEffect(() => {
    void listTracks()
      .catch(() => [])
      .then((a) => setInfo(summarize(collectLocal(localStorage), a)));
  }, []);

  const makeFile = async () => {
    const audios = await listTracks().catch(() => []);
    const file = buildBackup(collectLocal(localStorage), audios);
    return new File([JSON.stringify(file)], backupFileName(), { type: 'application/json' });
  };
  const done = (text: string) => {
    markBackup(localStorage);
    setDays(0);
    onSaved?.();
    setMsg(text);
  };

  const save = async () => {
    setBusy(true);
    try {
      const f = await makeFile();
      const url = URL.createObjectURL(f);
      const a = document.createElement('a');
      a.href = url;
      a.download = f.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      done('Copia guardada. Conservá el archivo en un lugar seguro (por ejemplo, tu nube o tu correo).');
    } finally {
      setBusy(false);
    }
  };

  // el menú de compartir del sistema (Drive, correo, WhatsApp…): sólo cuenta como copia hecha si se compartió de verdad
  const share = async () => {
    setBusy(true);
    try {
      const r = await compartirArchivo(navigator, await makeFile(), 'Copia de HarmonyJazz');
      if (r === 'compartido') done('Copia compartida. Fijate que haya quedado en el lugar que elegiste (tu nube o tu correo).');
      else if (r === 'error') setMsg('No se pudo abrir el menú de compartir. Probá «Guardar copia».');
    } finally {
      setBusy(false);
    }
  };

  const protect = async () => {
    const r = await pedirProteccion();
    setProt(r);
    if (r === 'no') setMsg('El navegador no concedió la protección. Suele darla cuando la app está instalada en la pantalla de inicio; mientras tanto, guardá copias.');
  };

  const restore = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    try {
      const parsed = parseBackup(await f.text());
      if (typeof parsed === 'string') return setMsg(parsed);
      const s = summarize(parsed.data, parsed.audios);
      const ok = window.confirm(
        `Vas a REEMPLAZAR los datos de este dispositivo por los de la copia${parsed.created ? ` (${parsed.created.slice(0, 10)})` : ''}:\n` +
          `· ${s.tunes} temas · ${s.phrases} frases · ${s.mastered} ejercicios con progreso · ${s.audios} audios con pasajes\n\n` +
          'Los audios de Transcribir no viajan en la copia: sus pasajes se recuperan sólo para los audios que ya estén cargados acá.\n\n¿Seguir?',
      );
      if (!ok) return;
      const n = applyLocal(localStorage, parsed.data);
      const dropped = parsed.dropped?.length ? ` Se ignoraron datos dañados de la copia: ${parsed.dropped.join(', ')}.` : '';
      let back = 0;
      for (const m of parsed.audios) {
        if (await getBlob(m.id).catch(() => null)) {
          await saveMeta(normalizeMeta(m)).catch(() => undefined);
          back++;
        }
      }
      setMsg(`Restaurado: ${n} grupos de datos y los pasajes de ${back} audios.${dropped} Recargando…`);
      setTimeout(() => window.location.reload(), 900);
    } finally {
      setBusy(false);
    }
  };

  const stale = info && hasData(info) && (days === null || days >= 14);
  return (
    <section className="card" id="copia">
      <h2 className="h3like">Copia de seguridad</h2>
      <p className="muted small">
        Tus temas, frases, progreso y ajustes viven sólo en este navegador. Si se borran los datos del sitio o cambiás de celular, se pierden: guardá una copia de vez en cuando.
        {info && hasData(info) ? ` Hoy tenés ${info.tunes} temas, ${info.phrases} frases y ${info.audios} audios.` : ''}
      </p>
      {prot === 'si' && <p className="muted small" role="status">🔒 Datos protegidos: el navegador no los borra si falta espacio.</p>}
      {prot === 'no' && (
        <div role="status" className="small">
          <b>Datos sin proteger:</b> Android puede borrarlos si falta espacio.
          <div className="row"><button onClick={() => void protect()}>Pedir protección</button></div>
        </div>
      )}
      {stale && (
        <p role="status">
          <b>{days === null ? 'Todavía no hiciste ninguna copia.' : `Hace ${days} días que no hacés una copia.`}</b>
        </p>
      )}
      <div className="row">
        <button className="primary" onClick={() => void save()} disabled={busy}>Guardar copia</button>
        {canShare && <button onClick={() => void share()} disabled={busy}>Compartir copia</button>}
        <label className="button filebtn">
          Restaurar copia…
          <input type="file" accept="application/json,.json" hidden disabled={busy} onChange={(e) => { void restore(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
        {days !== null && !stale && <span className="muted small">Última copia: hace {days} {days === 1 ? 'día' : 'días'}</span>}
      </div>
      {msg && <p className="muted small" role="status">{msg}</p>}
    </section>
  );
}
