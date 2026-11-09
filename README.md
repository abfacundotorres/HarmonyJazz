# HarmonyJazz

Webapp para aprender jazz en trompeta: armonía aplicada, vocabulario, play-along generado y análisis de lo que tocás por micrófono. Todo escrito para trompeta en Si♭ (o en concierto).

- **Hoy:** plan diario con tonalidad del día, temporizador por bloque, racha e historial.
- **Play-along:** 14 progresiones (ii–V–I en las 12, blues, Rhythm changes, Autumn Leaves, modal, Coltrane, Giant Steps…) o la tuya, en cualquier tonalidad, con acorde actual, guide tones y escala.
- **Lecciones:** 12 lecciones de nivel avanzado con ejercicios generados en las 12 tonalidades y registro de tempos.
- **Vocabulario:** frases para transportar por el ciclo de cuartas.
- **Afinador:** afinación, medición de estabilidad en notas largas y notas de referencia.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # tests del núcleo musical, generadores y detector de altura
npm run build    # sitio estático en dist/
```

El diseño completo está en [`docs/DISENO.md`](docs/DISENO.md).

El micrófono necesita HTTPS o `localhost`. Usá auriculares para que el análisis no capte el acompañamiento.
