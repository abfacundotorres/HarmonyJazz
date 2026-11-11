/** Borrador de frase que viaja de Transcribir a Vocabulario (en localStorage, se consume una sola vez). */
export interface PhraseDraft {
  name: string;
  tempo: number;
  /** Notas en concierto, formato del Vocabulario. */
  line: string;
  idea: string;
}

const KEY = 'harmonyjazz:phrase-draft';

export function savePhraseDraft(d: PhraseDraft) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* sin almacenamiento */
  }
}

export function takePhraseDraft(): PhraseDraft | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    localStorage.removeItem(KEY);
    const d = JSON.parse(raw) as Partial<PhraseDraft>;
    if (typeof d.line !== 'string' || typeof d.name !== 'string') return null;
    return { name: d.name.slice(0, 80), tempo: typeof d.tempo === 'number' ? d.tempo : 120, line: d.line.slice(0, 4000), idea: typeof d.idea === 'string' ? d.idea.slice(0, 600) : '' };
  } catch {
    return null;
  }
}
