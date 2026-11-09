import { degreeNote, degreePc, Note } from './notes';

export interface ScaleDef {
  id: string;
  name: string;
  degrees: string[];
}

const S = (id: string, name: string, degrees: string) => ({ id, name, degrees: degrees.split(' ') });

export const SCALES: Record<string, ScaleDef> = Object.fromEntries(
  [
    S('ionian', 'Mayor (jónica)', '1 2 3 4 5 6 7'),
    S('dorian', 'Dórica', '1 2 b3 4 5 6 b7'),
    S('phrygian', 'Frigia', '1 b2 b3 4 5 b6 b7'),
    S('lydian', 'Lidia', '1 2 3 #4 5 6 7'),
    S('mixolydian', 'Mixolidia', '1 2 3 4 5 6 b7'),
    S('aeolian', 'Eólica', '1 2 b3 4 5 b6 b7'),
    S('locrian', 'Locria', '1 b2 b3 4 b5 b6 b7'),
    S('melodicMinor', 'Menor melódica', '1 2 b3 4 5 6 7'),
    S('lydianDominant', 'Lidia ♭7', '1 2 3 #4 5 6 b7'),
    S('mixolydianb6', 'Mixolidia ♭13', '1 2 3 4 5 b6 b7'),
    S('locrian2', 'Locria ♮2', '1 2 b3 4 b5 b6 b7'),
    S('altered', 'Alterada (superlocria)', '1 b2 #2 3 #4 b6 b7'),
    S('phrygianDominant', 'Mixolidia ♭9 ♭13', '1 b2 3 4 5 b6 b7'),
    S('halfWhole', 'Disminuida semitono-tono', '1 b2 #2 3 #4 5 6 b7'),
    S('wholeHalf', 'Disminuida tono-semitono', '1 2 b3 4 b5 #5 6 7'),
    S('wholeTone', 'Tonos enteros', '1 2 3 #4 #5 b7'),
    S('bebopDominant', 'Bebop dominante', '1 2 3 4 5 6 b7 7'),
    S('bebopMajor', 'Bebop mayor', '1 2 3 4 5 #5 6 7'),
    S('majorPent', 'Pentatónica mayor', '1 2 3 5 6'),
    S('minorPent', 'Pentatónica menor', '1 b3 4 5 b7'),
    S('blues', 'Blues', '1 b3 4 b5 5 b7'),
  ].map((s) => [s.id, s]),
);

export function scaleNotes(root: Note, scaleId: string): Note[] {
  return SCALES[scaleId].degrees.map((d) => degreeNote(root, d));
}

export function scalePcs(scaleId: string): number[] {
  return SCALES[scaleId].degrees.map(degreePc);
}
