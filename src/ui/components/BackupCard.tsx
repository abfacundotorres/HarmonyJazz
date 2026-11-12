import { useEffect, useState } from 'react';
import { applyLocal, backupFileName, buildBackup, collectLocal, daysSinceBackup, hasData, markBackup, parseBackup, summarize, Summary } from '../../state/backup';
import { getBlob, listTracks, normalizeMeta, saveMeta } from '../../transcribe/audioStore';

/** Copia de seguridad: guarda y restaura temas, frases, progreso, ajustes y fichas de los audios. */
export function BackupCard() {
  const [msg, setMsg] = useState('');
  const [days, setDays] = useState<number | null>(() => daysSinceBackup(localStorage));
  const [info, setInfo] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void listTracks()
      .catch(() => [])
      .then((a) => setInfo(summarize(collectLocal(localStorage), a)));
  }, []);

  const save = async () => {
    setBusy(true);
    try {
      const audios = await listTracks().catch(() => []);
      const file = buildBackup(collectLocal(localStorage), audios);
      const url = URL.createObjectURL(new Blob([JSON.stringify(file)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = backupFileName();
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      markBackup(localStorage);
      setDays(0);
      setMsg('Copia guardada. Conservá el archivo en un lugar seguro (por ejemplo, tu nube o tu correo).');
    } finally {
      setBusy(false);
    }
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
    <section className="card">
      <h2 className="h3like">Copia de seguridad</h2>
      <p className="muted small">
        Tus temas, frases, progreso y ajustes viven sólo en este navegador. Si se borran los datos del sitio o cambiás de celular, se pierden: guardá una copia de vez en cuando.
        {info && hasData(info) ? ` Hoy tenés ${info.tunes} temas, ${info.phrases} frases y ${info.audios} audios.` : ''}
      </p>
      {stale && (
        <p role="status">
          <b>{days === null ? 'Todavía no hiciste ninguna copia.' : `Hace ${days} días que no hacés una copia.`}</b>
        </p>
      )}
      <div className="row">
        <button className="primary" onClick={() => void save()} disabled={busy}>Guardar copia</button>
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
